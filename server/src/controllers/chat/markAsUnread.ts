import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const markAsUnread = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);

    // Check if user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    // Set isMarkedUnread to true
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      data: { isMarkedUnread: true }
    });

    // Notify current user to refresh their list
    io.to(`user:${userId}`).emit('conversation_updated', { 
      conversationId: convId,
      userId: userId,
      action: 'unread'
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Mark as unread error:', err);
    return res.status(500).json({ message: 'Error marking messages as unread' });
  }
};
