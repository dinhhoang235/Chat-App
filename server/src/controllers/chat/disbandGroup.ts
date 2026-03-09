import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const disbandGroup = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);

    // Check if user is participant and is owner/admin
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      include: {
        conversation: true
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    if (!participant.conversation.isGroup) {
      return res.status(400).json({ message: 'Only groups can be disbanded' });
    }

    if (participant.role !== 'owner' && participant.role !== 'admin') {
      return res.status(403).json({ message: 'Only owner or admin can disband the group' });
    }

    // Get all participants to notify them before deleting
    const allParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId }
    });

    // Delete the conversation and all its relations (Cascade delete handled by Prisma/DB)
    await prisma.conversation.delete({
      where: { id: convId }
    });

    // Notify all participants
    allParticipants.forEach(p => {
      io.to(`user:${p.userId}`).emit('conversation_disbanded', { conversationId: convId });
    });

    return res.json({ message: 'Group disbanded successfully' });
  } catch (err) {
    console.error('Disband group error:', err);
    return res.status(500).json({ message: 'Error disbanding group' });
  }
};
