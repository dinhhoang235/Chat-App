import { Response } from 'express';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const pinConversation = async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const { pinned } = req.body;
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

    // Update isPinned
    const updatedParticipant = await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      data: { 
        isPinned: !!pinned
      }
    });

    return res.json({ 
      success: true, 
      isPinned: updatedParticipant.isPinned
    });
  } catch (err) {
    console.error('Pin conversation error:', err);
    return res.status(500).json({ message: 'Error pinning conversation' });
  }
};
