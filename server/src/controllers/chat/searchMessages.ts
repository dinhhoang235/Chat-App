import { Response } from 'express';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const searchMessages = async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const { q } = req.query;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ message: 'Search query is required' });
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

    const messages = await prisma.message.findMany({
      where: {
        conversationId: convId,
        content: {
          contains: q
        },
        createdAt: {
          gt: participant.deletedAt || new Date(0)
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        }
      }
    });

    return res.json(messages);
  } catch (err) {
    console.error('Search messages error:', err);
    return res.status(500).json({ message: 'Error searching messages' });
  }
};
