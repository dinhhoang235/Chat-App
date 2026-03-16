import { Response } from 'express';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const muteConversation = async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const { mutedUntil } = req.body;
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

    // Update mutedUntil
    const updatedParticipant = await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      data: { 
        mutedUntil: mutedUntil ? new Date(mutedUntil) : null 
      }
    });

    return res.json({ 
      success: true, 
      mutedUntil: updatedParticipant.mutedUntil 
    });
  } catch (err) {
    console.error('Mute conversation error:', err);
    return res.status(500).json({ message: 'Error muting conversation' });
  }
};
