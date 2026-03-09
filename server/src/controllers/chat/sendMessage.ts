import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';
import { cacheMessage } from '../../utils/redis.js';

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
    
    // Reactivate for all OTHER participants who previously "hid" it
    // We reset hiddenAt to make conversation visible again,
    // but KEEP deletedAt to ensure they don't see older messages.
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: convId,
        userId: { not: userId },
        hiddenAt: { not: null }
      },
      data: {
        hiddenAt: null
      }
    });

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
