import { Response } from 'express';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';
import { getUserStatus } from '../../utils/redis.js';

export const getConversationDetails = async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);

    const conversation = await prisma.conversation.findUnique({
      where: { id: convId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
                phone: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    // Add status for each participant
    const participantsWithStatus = await Promise.all(conversation.participants.map(async (p) => {
      const status = await getUserStatus(p.userId);
      return {
        id: p.id,
        userId: p.userId,
        role: p.role,
        lastReadAt: p.lastReadAt,
        joinedAt: p.joinedAt,
        // @ts-ignore
        mutedUntil: p.mutedUntil,
        user: {
          ...p.user,
          status: status === 'online' ? 'online' : 'offline'
        }
      };
    }));

    return res.json({
      ...conversation,
      participants: participantsWithStatus,
      membersCount: conversation.participants.length
    });
  } catch (err) {
    console.error('Get conversation details error:', err);
    return res.status(500).json({ message: 'Error fetching conversation details' });
  }
};
