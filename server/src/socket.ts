import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { TokenPayload } from './utils/jwt.js';
import prisma from './db.js';

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
      socket.join(`user:${socket.user.userId}`);
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

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.userId}`);
    });
  });
};
