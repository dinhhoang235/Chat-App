import { Response } from 'express';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const getConversationMedia = async (req: AuthRequest, res: Response): Promise<any> => {
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
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const take = parseInt(limit as string);
    const cursorId = cursor ? parseInt(cursor as string) : undefined;

    const messages = await prisma.message.findMany({
      where: { 
        conversationId: convId,
        createdAt: {
          gt: participant.deletedAt || new Date(0) // Ensure we only get messages after user joined/deleted
        },
        OR: [
          { type: 'image' },
          { type: 'video' },
          { type: 'audio' },
          { type: 'file' },
          { 
            type: 'text',
            content: { contains: 'http' } // Simple heuristic for links
          }
        ]
      },
      take: take,
      skip: cursorId ? 1 : 0,
      cursor: cursorId ? { id: cursorId } : undefined,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        type: true,
        content: true,
        createdAt: true,
        senderId: true,
        sender: {
          select: {
            id: true,
            fullName: true,
            avatar: true
          }
        }
      }
    });
    
    const mappedMessages = messages.map(m => {
      let fileInfo = null;
      if (m.type === 'file' || m.type === 'image' || m.type === 'video' || m.type === 'audio') {
        try {
          fileInfo = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
        } catch {
          if (m.type === 'image' || m.type === 'video' || m.type === 'audio') {
            fileInfo = { url: m.content };
          }
        }
      }
      return { ...m, fileInfo };
    });

    res.json(mappedMessages);
  } catch (err) {
    console.error('Get conversation media error:', err);
    return res.status(500).json({ message: 'Error fetching conversation media' });
  }
};
