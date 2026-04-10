import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { TokenPayload } from './utils/jwt.js';
import prisma from './db.js';
import { setUserStatus, setCallInfo, getCallInfo, deleteCallInfo, cacheMessage } from './utils/redis.js';
import { sendPushNotifications, formatMessageNotification } from './utils/notification.js';

const JWT_SECRET = process.env.JWT_SECRET!;

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
    socket.on('call_invite', ({ callId, conversationId, targetUserId, callType, callerName, callerAvatar }: any) => {
      console.log(`[Call] Invite: ${socket.user?.userId} → ${targetUserId} (callId: ${callId})`);
      
      // Store call info in Redis for tracking duration and state
      setCallInfo(callId, {
        conversationId,
        callerId: socket.user?.userId,
        targetUserId,
        callType,
        startTime: null, // Not started yet
        invitationTime: Date.now(),
      }).catch(err => console.error('[Call] Redis set error:', err));

      const room = `user:${targetUserId}`;
      io.to(room).emit('incoming_call', {
        callId,
        conversationId,
        callerId: socket.user?.userId,
        callerName,
        callerAvatar,
        callType,
      });
      
      // Send push notification to target user ONLY if they are not currently connected via socket
      io.in(room).fetchSockets().then(sockets => {
        console.log(`[Call] Emitted to ${room}, participants connected: ${sockets.length}`);
        
        if (sockets.length === 0) {
          prisma.user.findUnique({
            where: { id: Number(targetUserId) },
            select: { pushToken: true }
          }).then(targetUser => {
            if (targetUser?.pushToken) {
              sendPushNotifications([targetUser.pushToken], {
                title: callerName || 'Cuộc gọi đến',
                body: `Bạn có cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} từ ${callerName || 'ai đó'}`,
                data: {
                  type: 'call',
                  callId,
                  conversationId,
                  callType,
                  callerName,
                  callerAvatar
                },
                channelId: 'call',
                sound: 'notification.mp3'
              }).catch(err => console.error('[Call] Push error:', err));
            }
          }).catch(err => console.error('[Call] Db fetch error:', err));
        } else {
          console.log(`[Call] Skipping push notification for ${targetUserId} as they are online via socket`);
        }
      });
    });

    // Callee → Server: accepted call
    socket.on('call_accept', async ({ callId, callerId }: any) => {
      // Update call info with start time
      const callInfo = await getCallInfo(callId);
      if (callInfo) {
        callInfo.startTime = Date.now();
        await setCallInfo(callId, callInfo);
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
        const convId = Number(callInfo.conversationId);
        // Create a message for the call log
        const message = await prisma.message.create({
          data: {
            conversationId: convId,
            senderId: Number(callInfo.callerId), // Who made the call
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
          console.error('[Call] Error updating conversation metadata (reject):', err);
        }

        // Broadcast the log message to both participants
        io.to(`conversation:${convId}`).emit('new_message', message);
        await cacheMessage(convId, message);

        // Update conversation list for both
        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId: convId },
          include: { user: { select: { id: true, pushToken: true } } }
        });

        participants.forEach(p => {
          io.to(`user:${p.userId}`).emit('conversation_updated', {
            conversationId: convId,
            lastMessage: message
          });
        });
        
        await deleteCallInfo(callId);
      }

      io.to(`user:${callerId}`).emit('call_rejected', {
        callId,
        rejecterId: socket.user?.userId,
      });
    });

    // Either side → Server: end active call
    socket.on('call_end', async ({ callId, targetUserId }: any) => {
      const callInfo = await getCallInfo(callId);
      if (callInfo) {
        const convId = Number(callInfo.conversationId);
        const isMissed = !callInfo.startTime;
        const duration = isMissed ? 0 : Math.floor((Date.now() - callInfo.startTime) / 1000);
        
        // Create a message for the call log
        const message = await prisma.message.create({
          data: {
            conversationId: convId,
            senderId: Number(callInfo.callerId),
            content: JSON.stringify({
              callType: callInfo.callType,
              status: isMissed ? 'missed' : 'completed',
              duration: duration
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
          .filter(p => p.userId !== Number(callInfo.callerId) && p.user.pushToken)
          .map(p => p.user.pushToken as string);

        if (pushTokens.length > 0 && isMissed) {
          const notificationPayload = formatMessageNotification(message);
          sendPushNotifications(pushTokens, notificationPayload).catch(err => console.error('[Call] Push error (end):', err));
        }

        participants.forEach(p => {
          io.to(`user:${p.userId}`).emit('conversation_updated', {
            conversationId: convId,
            lastMessage: message
          });
        });

        await deleteCallInfo(callId);
      }

      io.to(`user:${targetUserId}`).emit('call_ended', { callId });
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
