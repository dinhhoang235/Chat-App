import { Response } from 'express';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';
import { getUserStatus } from '../../utils/redis.js';

export const getConversations = async (req: AuthRequest, res: Response): Promise<any> => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { 
            userId,
            hiddenAt: null
          }
        }
      },
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
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Manually calculate unread count and add user status for each conversation
    const mappedConversations = await Promise.all(conversations.map(async (conv) => {
      const participant = conv.participants.find(p => p.userId === userId);
      const deletedAt = participant?.deletedAt || new Date(0);

      // Filter messages to only show those created after deletedAt
      const lastMessage = conv.messages.length > 0 && conv.messages[0].createdAt > deletedAt
        ? conv.messages
        : [];

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: { 
            gt: participant?.lastReadAt && participant.lastReadAt > deletedAt 
              ? participant.lastReadAt 
              : deletedAt 
          }
        }
      });

      // Add status for the other participant
      const participantsWithStatus = await Promise.all(conv.participants.map(async (p) => {
        const status = await getUserStatus(p.userId);
        return {
          ...p,
          user: {
            ...p.user,
            status: status === 'online' ? 'online' : 'offline'
          }
        };
      }));

      return {
        ...conv,
        messages: lastMessage,
        participants: participantsWithStatus,
        membersCount: conv.participants.length,
        _count: {
          messages: unreadCount
        }
      };
    }));

    return res.json(mappedConversations);
  } catch (err) {
    console.error('Get conversations error:', err);
    return res.status(500).json({ message: 'Error fetching conversations' });
  }
};
