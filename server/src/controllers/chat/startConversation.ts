import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';
import { uploadFile } from '../../utils/minio.js';

export const startConversation = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { targetUserId } = req.body;
  let { firstMessage } = req.body;
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

    // If there is a file we need to handle it similarly to sendMessage
    let messageType = 'text';
    if (req.file) {
      // enforce size limit
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: 'File must be under 5MB' });
      }
      
      const { url: fileUrl } = await uploadFile(req.file);
      const info = {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mime: req.file.mimetype
      };
      firstMessage = JSON.stringify(info);
      if (req.file.mimetype.startsWith('image/')) {
        messageType = 'image';
      } else {
        messageType = 'file';
      }
    }

    // if there is no message text and no file, respond with 404 so frontend knows it doesn't exist
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
            type: req.body.type || messageType,
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
