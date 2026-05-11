import { Request, Response } from 'express';
import prisma from '../../db.js';
import { Server } from 'socket.io';
import { clearCachedMessages } from '../../utils/redis.js';

export const deleteMessage = (io: Server) => async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { mode } = req.body; // 'unsend' (everyone) or 'deleteForMe' (just me)
    const userId = Number((req as any).userId);

    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) },
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (mode === 'unsend') {
      // Check if user is the sender
      if (message.senderId !== userId) {
        return res.status(403).json({ message: 'You can only unsend your own messages' });
      }

      await prisma.message.update({
        where: { id: message.id },
        data: {
          isRevoked: true,
        },
      });

      // Notify others via socket
      io.to(`conversation:${message.conversationId}`).emit('message_revoked', {
        messageId: message.id,
        conversationId: message.conversationId,
      });

      // Invalidate Redis cache so next fetch returns correct data
      clearCachedMessages(message.conversationId).catch(() => {});

      return res.status(200).json({ message: 'Message unsent successfully' });
    } else if (mode === 'deleteForMe') {
      await prisma.messageDeletion.create({
        data: {
          messageId: message.id,
          userId: userId,
        },
      });

      return res.status(200).json({ message: 'Message hidden for you' });
    }
    
    return res.status(400).json({ message: 'Invalid delete mode' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
