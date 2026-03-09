import { Response } from 'express';
import prisma from '../db.js';
import { Server } from 'socket.io';
import { AuthRequest } from '../middleware/auth.js';
import { getCachedMessages, bulkCacheMessages, cacheMessage, getUserStatus, clearCachedMessages } from '../utils/redis.js';

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
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Manually calculate unread count and add user status for each conversation
    const mappedConversations = await Promise.all(conversations.map(async (conv) => {
      const participant = conv.participants.find(p => p.userId === userId);
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: { gt: participant?.lastReadAt || new Date(0) }
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
      if (cached && cached.length > 0) {
        console.log('Serving messages from Redis cache');
        messages = cached;
        fromCache = true;
      }
    }

    if (!messages) {
      messages = await prisma.message.findMany({
        where: { conversationId: convId },
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
      const seenBy = participants
        .filter(p => p.userId !== msg.senderId && new Date(p.lastReadAt).getTime() >= new Date(msg.createdAt).getTime())
        .map(p => ({
          id: p.user.id,
          fullName: p.user.fullName,
          avatar: p.user.avatar ? (p.user.avatar.startsWith('http') ? p.user.avatar : p.user.avatar) : null
        }));
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
    
    // 3. Cache the new message
    cacheMessage(convId, message).catch(e => console.error(e));
    
    // Also notify users who might not be in the conversation room currently 
    // but should see an updated list of conversations
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId }
    });

    participants.forEach(p => {
      io.to(`user:${p.userId}`).emit('conversation_updated', {
        conversationId: message.conversationId,
        lastMessage: message
      });
    });

    return res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ message: 'Error sending message' });
  }
};

export const startConversation = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { targetUserId } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const targetIdNum = parseInt(targetUserId);

  if (userId === targetIdNum) {
    return res.status(400).json({ message: 'Cannot chat with yourself' });
  }

  try {
    // Find existing 1:1 conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetIdNum } } }
        ]
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
      }
    });

    if (existing) {
      return res.json(existing);
    }

    // NEW LOGIC: If a message is provided, create the conversation. 
    // If NOT, we just return a 404 or empty response so the frontend knows it doesn't exist yet.
    const { firstMessage } = req.body;
    
    if (!firstMessage) {
      return res.status(404).json({ message: 'No existing conversation' });
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [
            { userId },
            { userId: targetIdNum }
          ]
        },
        messages: {
          create: {
            content: firstMessage,
            senderId: userId
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
      }
    });

    // Notify both users about the new conversation
    const lastMessage = conversation.messages[0];
    io.to(`user:${userId}`).emit('conversation_updated', { 
      conversationId: conversation.id,
      lastMessage
    });
    io.to(`user:${targetIdNum}`).emit('conversation_updated', { 
      conversationId: conversation.id,
      lastMessage
    });

    return res.status(201).json(conversation);
  } catch (err) {
    console.error('Start conversation error:', err);
    return res.status(500).json({ message: 'Error starting conversation' });
  }
};

export const deleteConversation = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
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

    // Get all participants before deleting to notify them
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId },
      select: { userId: true }
    });

    // Delete conversation (cascade deletes participants and messages)
    await prisma.conversation.delete({
      where: { id: convId }
    });

    // Clear Redis cache
    await clearCachedMessages(convId);

    // Notify all participants
    participants.forEach(p => {
      io.to(`user:${p.userId}`).emit('conversation_deleted', { conversationId: convId });
    });

    return res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    return res.status(500).json({ message: 'Error deleting conversation' });
  }
};

export const createGroup = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { name, participantIds } = req.body;
  const userId = req.userId;
  const files = req.files as Express.Multer.File[];

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!name || !participantIds) {
    return res.status(400).json({ message: 'Invalid group data' });
  }

  const pIds = typeof participantIds === 'string' ? JSON.parse(participantIds) : participantIds;

  if (!Array.isArray(pIds) || pIds.length === 0) {
    return res.status(400).json({ message: 'Invalid group data' });
  }

  try {
    let avatarPath = null;
    if (files && files.length > 0) {
      const avatarFile = files.find(f => f.fieldname === 'group_avatar');
      if (avatarFile) {
        avatarPath = `/media/groups/${avatarFile.filename}`;
      }
    }

    // Add current user to participants if not already there
    const allParticipantIds = Array.from(new Set([...pIds.map(id => parseInt(id)), userId]));

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: true,
        name: name,
        avatar: avatarPath,
        participants: {
          create: allParticipantIds.map(id => ({
            userId: id
          }))
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
      }
    });

    // Notify all participants about the new group
    allParticipantIds.forEach(id => {
      io.to(`user:${id}`).emit('conversation_updated', {
        conversationId: conversation.id,
        action: 'new_group',
        conversation
      });
    });

    return res.status(201).json(conversation);
  } catch (err) {
    console.error('Create group error:', err);
    return res.status(500).json({ message: 'Error creating group' });
  }
};
