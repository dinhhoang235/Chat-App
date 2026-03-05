import { Response } from 'express';
import prisma from '../db.js';
import { Server } from 'socket.io';
import { AuthRequest } from '../middleware/auth.js';

export const getConversations = async (req: AuthRequest, res: Response): Promise<any> => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
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
        },
        _count: {
          select: {
            messages: {
              where: {
                // Approximate unread: messages after user lastReadAt
                // In a real app, you would join with participant's lastReadAt
                // For simplicity, we'll fetch lastReadAt separately or assume count
              }
            }
          }
        }
      }
    });

    return res.json(conversations);
  } catch (err) {
    console.error('Get conversations error:', err);
    return res.status(500).json({ message: 'Error fetching conversations' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<any> => {
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

    const messages = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
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

    // Update lastReadAt
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      data: { lastReadAt: new Date() }
    });

    return res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ message: 'Error fetching messages' });
  }
};

export const sendMessage = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const { content, type = 'text' } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);

    // 1. Create message in DB
    const message = await prisma.message.create({
      data: {
        content,
        type,
        conversationId: convId,
        senderId: userId
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

    // 2. Broadcast via socket
    io.to(`conversation:${convId}`).emit('new_message', message);
    
    // Also notify users who might not be in the conversation room currently 
    // but should see an updated list of conversations
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId }
    });

    participants.forEach(p => {
      if (p.userId !== userId) {
        io.to(`user:${p.userId}`).emit('conversation_updated', {
          conversationId: message.conversationId,
          lastMessage: message
        });
      }
    });

    return res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ message: 'Error sending message' });
  }
};

export const startConversation = async (req: AuthRequest, res: Response): Promise<any> => {
  const { targetUserId } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (userId === parseInt(targetUserId)) {
    return res.status(400).json({ message: 'Cannot chat with yourself' });
  }

  try {
    // Find existing 1:1 conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: parseInt(targetUserId) } } }
        ]
      }
    });

    if (existing) {
      return res.json(existing);
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId },
            { userId: parseInt(targetUserId) }
          ]
        }
      }
    });

    res.status(201).json(conversation);
  } catch (err) {
    console.error('Start conversation error:', err);
    res.status(500).json({ message: 'Error starting conversation' });
  }
};
