import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const markAsRead = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
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
      },
      include: {
        user: {
          select: {
            fullName: true,
            avatar: true
          }
        }
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const now = new Date();

    // Update lastReadAt
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      data: { lastReadAt: now }
    });

    // Notify other participants that this user has seen the messages
    io.to(`conversation:${convId}`).emit('message_seen', {
      conversationId: convId,
      userId,
      seenAt: now,
      user: {
        id: userId,
        fullName: participant.user.fullName,
        avatar: participant.user.avatar
      }
    });

    // Notify ALL participants to refresh conversation list unread count
    const allParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId }
    });

    allParticipants.forEach(p => {
      io.to(`user:${p.userId}`).emit('conversation_updated', { 
        conversationId: convId,
        userId: userId,
        action: 'read'
      });
    });

    return res.json({ success: true, seenAt: now });
  } catch (err) {
    console.error('Mark as read error:', err);
    return res.status(500).json({ message: 'Error marking messages as read' });
  }
};
