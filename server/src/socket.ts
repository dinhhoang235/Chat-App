import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { TokenPayload } from './utils/jwt.js';
import prisma from './db.js';
import { setUserStatus, setCallInfo, getCallInfo, deleteCallInfo, cacheMessage, getConversationCallId, setConversationCallId, deleteConversationCallId } from './utils/redis.js';
import { sendPushNotifications, formatMessageNotification } from './utils/notification.js';

const JWT_SECRET = process.env.JWT_SECRET!;
const CALL_TIMEOUT = 120000; // 2 minutes

const checkCallTimeouts = async (callId: string, io: any) => {
  const callInfo = await getCallInfo(callId);
  if (!callInfo) return;

  const now = Date.now();
  let changed = false;
  const invitedUserIds = new Set<number>(callInfo.invitedUserIds || []);
  const activeUserIds = new Set<number>(callInfo.activeUserIds || []);
  const rejectedUserIds = new Set<number>(callInfo.rejectedUserIds || []);
  const invitationTimes = callInfo.invitationTimes || {};

  for (const userId of invitedUserIds) {
    if (!activeUserIds.has(userId) && !rejectedUserIds.has(userId)) {
      const inviteTime = invitationTimes[userId] || callInfo.startTime || callInfo.invitationTime;
      if (now - inviteTime > CALL_TIMEOUT) {
        rejectedUserIds.add(userId);
        changed = true;
        
        io.to(`group_call:${callId}`).emit('call_rejected', {
          callId,
          userId,
          reason: 'timeout'
        });
        console.log(`[Call] Timeout for user ${userId} in call ${callId}`);
      }
    }
  }

  if (changed) {
    callInfo.rejectedUserIds = Array.from(rejectedUserIds);
    await setCallInfo(callId, callInfo);
  }
};

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export const setupSocket = (io: Server) => {
  // Middleware for authentication
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.userId}`);

    // Join personal room for private notifications/messages
    if (socket.user) {
      const userId = Number(socket.user.userId);
      socket.join(`user:${userId}`);
      
      // Update status to online in Redis
      setUserStatus(userId, 'online');
      
      // Notify all connected clients about user status change
      io.emit('user_status_changed', { userId, status: 'online' });
    }

    // Join conversation rooms
    socket.on('join_conversation', (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.user?.userId} joined conversation ${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.user?.userId} left conversation ${conversationId}`);
    });

    socket.on('query_active_call', async (data: any, callback: any) => {
      const conversationId = typeof data === 'object' ? data.conversationId : data;
      const callId = await getConversationCallId(conversationId);
      if (callId) {
        await checkCallTimeouts(callId, io);
        const callInfo = await getCallInfo(callId);
        if (callInfo) {
          if (typeof callback === 'function') {
            callback({ active: true, callId, callInfo });
          }
          return;
        }
      }
      if (typeof callback === 'function') {
        callback({ active: false });
      }
    });

    // Handle typing status
    socket.on('typing_start', async (conversationId: number) => {
      let avatar = '';
      if (socket.user?.userId) {
        try {
          // You might want to cache this in redis for better performance later
          const user = await prisma.user.findUnique({
            where: { id: socket.user.userId },
            select: { avatar: true }
          });
          avatar = user?.avatar || '';
        } catch (err) {
          console.error('Error fetching user avatar for typing event:', err);
        }
      }

      socket.to(`conversation:${conversationId}`).emit('user_typing_start', {
        userId: socket.user?.userId,
        conversationId,
        avatar
      });
    });

    socket.on('typing_stop', (conversationId: number) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing_stop', {
        userId: socket.user?.userId,
        conversationId
      });
    });

    // ─── WebRTC Call Signaling ────────────────────────────────

    // Caller → Server: invite target user to call
    socket.on('call_invite', async ({ callId, conversationId, targetUserId, callType, callerName, callerAvatar, groupTargets }: any) => {
      console.log(`[Call] Invite: ${socket.user?.userId} → ${targetUserId} (callId: ${callId})`);
      
      let resolvedCallId = callId;
      let existing: any = null;
      let currentGroupTargets: any[] = [];
      let invitedUserIds = new Set<number>();
      let rejectedUserIds = new Set<number>();
      let acceptedUserId: number | null = null;

      try {
        const activeCallId = conversationId ? await getConversationCallId(conversationId) : null;

        if (activeCallId && activeCallId !== callId) {
          resolvedCallId = activeCallId;
          existing = await getCallInfo(activeCallId);
          console.log(`[Call] Reusing existing active call ${resolvedCallId} for conversation ${conversationId}`);
        } else {
          existing = await getCallInfo(callId);
        }

        const existingGroupTargets = Array.isArray(existing?.groupTargets) ? existing.groupTargets : [];
        const incomingGroupTargets = Array.isArray(groupTargets) ? groupTargets : [];
        
        // Merge targets, keeping existing ones and adding new ones
        const combinedTargetsMap = new Map();
        existingGroupTargets.forEach((t: any) => combinedTargetsMap.set(Number(t.userId), t));
        incomingGroupTargets.forEach((t: any) => {
          const id = Number(t.userId);
          if (!combinedTargetsMap.has(id) || (!combinedTargetsMap.get(id).fullName && t.fullName)) {
            combinedTargetsMap.set(id, t);
          }
        });
        currentGroupTargets = Array.from(combinedTargetsMap.values());

        // Ensure caller is in groupTargets
        if (!combinedTargetsMap.has(Number(socket.user?.userId))) {
          currentGroupTargets.push({
            userId: Number(socket.user?.userId),
            fullName: callerName || 'Người gọi',
            avatar: callerAvatar || '',
          });
        }

        invitedUserIds = new Set<number>(existing?.invitedUserIds || []);
        rejectedUserIds = new Set<number>(existing?.rejectedUserIds || []);
        acceptedUserId = existing?.acceptedUserId ?? null;

        invitedUserIds.add(Number(targetUserId));
        
        const invitationTimes = existing?.invitationTimes || {};
        invitationTimes[Number(targetUserId)] = Date.now();

        const updatedInfo = {
          conversationId,
          callerId: socket.user?.userId,
          callType,
          startTime: existing?.startTime ?? null,
          invitationTime: existing?.invitationTime ?? Date.now(),
          invitationTimes,
          invitedUserIds: Array.from(invitedUserIds),
          rejectedUserIds: Array.from(rejectedUserIds),
          acceptedUserId,
          activeUserIds: existing?.activeUserIds ?? [socket.user?.userId],
          groupTargets: currentGroupTargets,
        };

        const shouldCreateStartMessage = !existing || (existing.invitedUserIds?.length ?? 0) === 0;
        await setCallInfo(resolvedCallId, updatedInfo);
        
        // Schedule timeout check
        setTimeout(() => checkCallTimeouts(resolvedCallId, io), CALL_TIMEOUT + 1000);

        if (!activeCallId) {
          await setConversationCallId(conversationId, resolvedCallId);
        }

        const isGroupCall = Array.isArray(currentGroupTargets) && currentGroupTargets.length > 1;
        if (isGroupCall) {
          socket.join(`group_call:${resolvedCallId}`);
          // Notify room about participant joined if they are already in the call record
          if (existing) {
             io.to(`group_call:${resolvedCallId}`).emit('participant_joined', { 
               userId: socket.user?.userId,
               fullName: callerName,
               avatar: callerAvatar || '',
               callId: resolvedCallId 
             });
          }
        }

        if (shouldCreateStartMessage) {
          try {
            const convId = Number(conversationId);
            const message = await prisma.message.create({
              data: {
                conversationId: convId,
                senderId: Number(socket.user?.userId),
                content: JSON.stringify({
                  callId: resolvedCallId,
                  callType,
                  status: 'started',
                  duration: 0,
                  callerId: socket.user?.userId,
                  callerName: (socket.user as any)?.fullName,
                  callerAvatar: (socket.user as any)?.avatar || '',
                  isGroupCall: Array.isArray(currentGroupTargets) && currentGroupTargets.length > 1,
                  groupTargets: currentGroupTargets,
                }),
                type: 'call',
              },
              include: {
                sender: {
                  select: { id: true, fullName: true, avatar: true },
                },
                conversation: {
                  select: { id: true, isGroup: true, name: true },
                },
              },
            });

            await prisma.conversation.update({
              where: { id: convId },
              data: { updatedAt: new Date() },
            });

            await prisma.conversationParticipant.updateMany({
              where: { conversationId: convId, hiddenAt: { not: null } },
              data: { hiddenAt: null },
            });

            io.to(`conversation:${convId}`).emit('new_message', message);
            await cacheMessage(convId, message);

            const participants = await prisma.conversationParticipant.findMany({
              where: { conversationId: convId },
              include: { user: { select: { id: true, pushToken: true } } },
            });

            participants.forEach((p: { userId: number }) => {
              io.to(`user:${p.userId}`).emit('conversation_updated', {
                conversationId: convId,
                lastMessage: message,
              });
            });
          } catch (err) {
            console.error('[Call] Error creating start call message:', err);
          }
        }
      } catch (err) {
        console.error('[Call] Redis set error:', err);
      }

      // Check if target user is online in socket
      const targetRoom = `user:${targetUserId}`;
      const targetSockets = await io.in(targetRoom).fetchSockets();
      const isOnline = targetSockets.length > 0;

      io.to(targetRoom).emit('incoming_call', {
        callId: resolvedCallId,
        conversationId,
        callerId: socket.user?.userId,
        callerName,
        callerAvatar,
        callType,
        groupTargets: currentGroupTargets,
      });
      
      // Only send push notification if user is NOT online
      // If they are online, the app will handle showing the UI/local notification via socket
      if (!isOnline) {
        prisma.user.findUnique({
          where: { id: Number(targetUserId) },
          select: { pushToken: true }
        }).then((targetUser: { pushToken?: string } | null) => {
          if (targetUser?.pushToken) {
            sendPushNotifications([targetUser.pushToken], {
              title: `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} đến`,
              body: `${callerName || 'Ai đó'} đang gọi cho bạn...`,
              data: {
                type: 'call',
                callId: resolvedCallId,
                conversationId,
                callType,
                callerName,
                callerAvatar,
                callerId: socket.user?.userId,
                groupTargets: currentGroupTargets,
                sentAt: Date.now() // Add timestamp to detect stale calls on client
              },
              channelId: 'call',
              categoryId: 'call',
              sound: 'notification.mp3'
            }).catch((err: unknown) => console.error('[Call] Push error:', err));
          }
        }).catch((err: unknown) => console.error('[Call] Db fetch error:', err));
      }
    });

    // Callee → Server: accepted call
    socket.on('call_accept', async ({ callId, callerId, accepterName, accepterAvatar }: any) => {
      const callInfo = await getCallInfo(callId);
      if (callInfo) {
        if (!callInfo.acceptedUserId) {
          callInfo.acceptedUserId = socket.user?.userId;
          callInfo.startTime = Date.now();
          await setCallInfo(callId, callInfo);
        }

        const isGroupCall = (callInfo.invitedUserIds?.length ?? 0) > 1;
        const activeUserIds = new Set(callInfo.activeUserIds || []);
        activeUserIds.add(Number(socket.user?.userId));
        callInfo.activeUserIds = Array.from(activeUserIds);

        // Update groupTargets with actual accepter metadata
        const groupTargets = Array.isArray(callInfo.groupTargets) ? callInfo.groupTargets : [];
        const existingTarget = groupTargets.find((t: any) => Number(t.userId) === Number(socket.user?.userId));
        if (existingTarget) {
          existingTarget.fullName = accepterName || existingTarget.fullName;
          existingTarget.avatar = accepterAvatar || existingTarget.avatar;
        } else {
          groupTargets.push({
            userId: Number(socket.user?.userId),
            fullName: accepterName || 'Người tham gia',
            avatar: accepterAvatar || '',
          });
        }
        callInfo.groupTargets = groupTargets;

        await setCallInfo(callId, callInfo);

        if (isGroupCall) {
          socket.join(`group_call:${callId}`);
          io.to(`group_call:${callId}`).emit('participant_joined', { 
            userId: socket.user?.userId,
            fullName: accepterName,
            avatar: accepterAvatar || '',
            callId 
          });
        }
      }

      io.to(`user:${callerId}`).emit('call_accepted', {
        callId,
        accepterId: socket.user?.userId,
      });
    });

    // Callee → Server: rejected call
    socket.on('call_reject', async ({ callId, callerId }: any) => {
      const callInfo = await getCallInfo(callId);
      if (callInfo) {
        const rejectedUserIds = new Set<number>(callInfo.rejectedUserIds || []);
        rejectedUserIds.add(Number(socket.user?.userId));
        callInfo.rejectedUserIds = Array.from(rejectedUserIds);

        const invitedUserIds = new Set<number>(callInfo.invitedUserIds || []);
        const allRejected = invitedUserIds.size > 0 && rejectedUserIds.size >= invitedUserIds.size;

        await setCallInfo(callId, callInfo);

        if (allRejected && !callInfo.acceptedUserId) {
          const convId = Number(callInfo.conversationId);
          const message = await prisma.message.create({
            data: {
              conversationId: convId,
              senderId: Number(callInfo.callerId),
              content: JSON.stringify({
                callType: callInfo.callType,
                status: 'rejected',
                duration: 0
              }),
              type: 'call',
            },
            include: {
              sender: {
                select: {
                  id: true,
                  fullName: true,
                  avatar: true,
                },
              },
              conversation: {
                select: {
                  id: true,
                  isGroup: true,
                  name: true
                }
              }
            },
          });

          try {
            await prisma.conversation.update({
              where: { id: convId },
              data: { updatedAt: new Date() }
            });

            await prisma.conversationParticipant.updateMany({
              where: { conversationId: convId, hiddenAt: { not: null } },
              data: { hiddenAt: null }
            });
          } catch (err) {
            console.error('[Call] Error updating conversation metadata (reject):', err);
          }

          io.to(`conversation:${convId}`).emit('new_message', message);
          await cacheMessage(convId, message);

          const participants = await prisma.conversationParticipant.findMany({
            where: { conversationId: convId },
            include: { user: { select: { id: true, pushToken: true } } }
          });

          participants.forEach((p: { userId: number }) => {
            io.to(`user:${p.userId}`).emit('conversation_updated', {
              conversationId: convId,
              lastMessage: message
            });
          });

          await deleteCallInfo(callId);
          if (callInfo?.conversationId) {
            await deleteConversationCallId(callInfo.conversationId);
          }
          io.to(`user:${callerId}`).emit('call_rejected', {
            callId,
            rejecterId: socket.user?.userId,
            final: true,
          });
          return;
        }
      }

      io.to(`user:${callerId}`).emit('call_rejected', {
        callId,
        rejecterId: socket.user?.userId,
      });
    });

    // Either side → Server: end active call
    socket.on('call_end', async ({ callId, targetUserId }: any) => {
      const callInfo = await getCallInfo(callId);
      if (!callInfo) return;

      const userId = Number(socket.user?.userId);
      const activeUserIds = (callInfo.activeUserIds || []).map((id: any) => Number(id));
      const remainingUsers = activeUserIds.filter((id: number) => id !== userId);
      const isGroupCall = (callInfo.invitedUserIds?.length ?? 0) > 1;

      console.log(`[Call] End request from ${userId}. Active: ${activeUserIds}. Remaining: ${remainingUsers}`);

      if (isGroupCall && remainingUsers.length >= 2) {
        // Just remove the user from active participants and notify others
        callInfo.activeUserIds = remainingUsers;
        await setCallInfo(callId, callInfo);
        
        io.to(`group_call:${callId}`).emit('participant_left', { 
          callId, 
          userId,
          remainingCount: remainingUsers.length 
        });
        socket.leave(`group_call:${callId}`);
        console.log(`[Call] Participant ${userId} left group call ${callId}. Call continues with ${remainingUsers.length} users.`);
        return;
      }

      // If we reach here, it's either a P2P call or a group call with 1 user left
      const convId = Number(callInfo.conversationId);
      const isMissed = !callInfo.startTime;
      const duration = isMissed ? 0 : Math.floor((Date.now() - callInfo.startTime) / 1000);
      
      // Create a message for the call log
      const message = await prisma.message.create({
        data: {
          conversationId: convId,
          senderId: Number(callInfo.callerId),
          content: JSON.stringify({
            callId,
            callType: callInfo.callType,
            status: isMissed ? 'missed' : 'completed',
            duration,
            isGroupCall,
          }),
          type: 'call',
        },
        include: {
          sender: {
            select: { id: true, fullName: true, avatar: true },
          },
          conversation: {
            select: { id: true, isGroup: true, name: true },
          },
        },
      });

      // Update conversation metadata
      try {
        await prisma.conversation.update({
          where: { id: convId },
          data: { updatedAt: new Date() }
        });

        await prisma.conversationParticipant.updateMany({
          where: { conversationId: convId, hiddenAt: { not: null } },
          data: { hiddenAt: null }
        });
      } catch (err) {
        console.error('[Call] Error updating conversation metadata (end):', err);
      }

      // Broadcast the log message
      io.to(`conversation:${convId}`).emit('new_message', message);
      await cacheMessage(convId, message);

      // Update conversation list for both
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId },
        include: { user: { select: { id: true, pushToken: true } } }
      });

      const pushTokens = participants
        .filter((p: { userId: number; user: { pushToken?: string } }) => p.userId !== Number(callInfo.callerId) && p.user.pushToken)
        .map((p: { user: { pushToken?: string } }) => p.user.pushToken as string);

      if (pushTokens.length > 0 && isMissed) {
        const notificationPayload = formatMessageNotification(message);
        sendPushNotifications(pushTokens, notificationPayload).catch((err: unknown) => console.error('[Call] Push error (end):', err));
      }

      participants.forEach((p: { userId: number }) => {
        io.to(`user:${p.userId}`).emit('conversation_updated', {
          conversationId: convId,
          lastMessage: message
        });
      });

      await deleteCallInfo(callId);
      if (callInfo?.conversationId) {
        await deleteConversationCallId(callInfo.conversationId);
      }

      if (isGroupCall) {
        io.to(`group_call:${callId}`).emit('call_ended', { callId });
        // Make sure all sockets leave the group call room
        const roomSockets = await io.in(`group_call:${callId}`).fetchSockets();
        roomSockets.forEach(s => s.leave(`group_call:${callId}`));
      } else {
        io.to(`user:${targetUserId}`).emit('call_ended', { callId });
        io.to(`user:${userId}`).emit('call_ended', { callId });
      }
    });

    // Caller → Server → Callee: WebRTC offer SDP
    socket.on('webrtc_offer', ({ callId, targetUserId, offer }: any) => {
      console.log(`[Signaling] Offer: ${socket.user?.userId} → ${targetUserId} (callId: ${callId})`);
      io.to(`user:${targetUserId}`).emit('webrtc_offer', {
        callId,
        from: socket.user?.userId,
        offer,
      });
    });

    // Callee → Server → Caller: WebRTC answer SDP
    socket.on('webrtc_answer', ({ callId, targetUserId, answer }: any) => {
      console.log(`[Signaling] Answer: ${socket.user?.userId} → ${targetUserId} (callId: ${callId})`);
      io.to(`user:${targetUserId}`).emit('webrtc_answer', {
        callId,
        from: socket.user?.userId,
        answer,
      });
    });

    // Either side → Server → Other: ICE candidate
    socket.on('webrtc_ice_candidate', ({ callId, targetUserId, candidate }: any) => {
      io.to(`user:${targetUserId}`).emit('webrtc_ice_candidate', {
        callId,
        from: socket.user?.userId,
        candidate,
      });
    });

    // Camera toggle signaling
    socket.on('camera_toggle', ({ callId, targetUserId, enabled }: any) => {
      console.log(`[Signaling] Camera toggle: ${socket.user?.userId} → ${targetUserId} (${enabled})`);
      io.to(`user:${targetUserId}`).emit('camera_toggle', {
        callId,
        userId: socket.user?.userId,
        enabled,
      });
    });

    // ─────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.userId}`);
      if (socket.user) {
        const userId = Number(socket.user.userId);
        // Mark as offline in Redis (this stores the current timestamp)
        setUserStatus(userId, 'offline');
        
        // Broadcast the change to all other users
        io.emit('user_status_changed', { 
          userId, 
          status: 'offline', 
          lastSeen: Date.now() 
        });
      }
    });
  });
};
