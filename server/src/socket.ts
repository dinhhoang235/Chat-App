import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { TokenPayload } from './utils/jwt.js';
import prisma from './db.js';
import { setUserStatus } from './utils/redis.js';

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
      io.to(`user:${targetUserId}`).emit('incoming_call', {
        callId,
        conversationId,
        callerId: socket.user?.userId,
        callerName,
        callerAvatar,
        callType,
      });
      console.log(`[Call] ${socket.user?.userId} → ${targetUserId} (${callType}) callId=${callId}`);
    });

    // Callee → Server: accepted call
    socket.on('call_accept', ({ callId, callerId }: any) => {
      io.to(`user:${callerId}`).emit('call_accepted', {
        callId,
        accepterId: socket.user?.userId,
      });
    });

    // Callee → Server: rejected call
    socket.on('call_reject', ({ callId, callerId }: any) => {
      io.to(`user:${callerId}`).emit('call_rejected', {
        callId,
        rejecterId: socket.user?.userId,
      });
    });

    // Either side → Server: end active call
    socket.on('call_end', ({ callId, targetUserId }: any) => {
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
