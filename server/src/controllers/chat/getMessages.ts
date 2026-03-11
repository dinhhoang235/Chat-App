import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';
import { getCachedMessages, bulkCacheMessages } from '../../utils/redis.js';

export const getMessages = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const { cursor, limit = '20' } = req.query;
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

    const take = parseInt(limit as string);
    const cursorId = cursor ? parseInt(cursor as string) : undefined;

    let messages;
    let fromCache = false;

    // 1. Try to get from Cache if it's the first page (no cursor)
    if (!cursor) {
      const cached = await getCachedMessages(convId, take);
      // Only serve from cache if it satisfies the full request or we can be sure it's the end (but we can't easily)
      // So we only use cache if it has at least 'take' items OR if we want to be more relaxed.
      // Let's go with: if we have at least 'take' items, use cache.
      if (cached && cached.length >= take) {
        const filteredCached = participant.deletedAt 
          ? cached.filter((m: any) => new Date(m.createdAt) > (participant.deletedAt as Date))
          : cached;
          
        if (filteredCached.length > 0) {
          messages = filteredCached;
          fromCache = true;
        }
      }
    }
    if (!messages) {
      messages = await prisma.message.findMany({
        where: { 
          conversationId: convId,
          createdAt: {
            gt: participant.deletedAt || new Date(0)
          }
        },
        take: take,
        skip: cursorId ? 1 : 0,
        cursor: cursorId ? { id: cursorId } : undefined,
        orderBy: { id: 'desc' }, // Use ID for more reliable cursor pagination
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
    }

    // Get participants to determine who has seen which messages
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        }
      }
    });

    // Map messages to include seenBy info - ALWAYS recompute from current DB state
    const messagesWithSeen = messages.map(msg => {
      const seenBy = msg.senderId ? participants
        .filter(p => p.userId !== msg.senderId && new Date(p.lastReadAt).getTime() >= new Date(msg.createdAt).getTime())
        .map(p => ({
          id: p.user.id,
          fullName: p.user.fullName,
          avatar: p.user.avatar ? (p.user.avatar.startsWith('http') ? p.user.avatar : p.user.avatar) : null
        })) : [];
      return { ...msg, seenBy, fromMe: msg.senderId === userId };
    });

    // 2. Cache first page if we just fetched it from DB (store raw messages, not computed seenBy)
    if (!cursor && !fromCache) {
      bulkCacheMessages(convId, messages).catch(e => console.error(e));
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
    });

    return res.json(messagesWithSeen);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ message: 'Error fetching messages' });
  }
};
