import { Response } from 'express';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';
import { cacheMessage } from '../../utils/redis.js';
import Expo from 'expo-server-sdk';

export const sendMessage = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  let { content, type = 'text' } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);

    // if a file was uploaded, override content and type accordingly
    if (req.file) {
      // enforce <5MB for attachments
      if (req.file.size > 5 * 1024 * 1024) {
        // remove oversize file
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ message: 'File must be under 5MB' });
      }
      const folder = path.basename(path.dirname(req.file.path)); // attachments, etc
      const relPath = `/${folder}/${req.file.filename}`;
      const info = {
        url: relPath,
        name: req.file.originalname,
        size: req.file.size,
        mime: req.file.mimetype
      };
      content = JSON.stringify(info);
      if (req.file.mimetype.startsWith('image/')) {
        type = 'image';
      } else {
        type = 'file';
      }
    }

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
      where: { conversationId: convId },
      include: { user: true }
    });

    participants.forEach(p => {
      io.to(`user:${p.userId}`).emit('conversation_updated', {
        conversationId: message.conversationId,
        lastMessage: message
      });
    });

    // send push notifications to participants with push tokens (excluding sender)
    try {
      // expo-server-sdk is now a normal dependency
      const expo = new Expo();
      const pushMessages: any[] = [];

      // log participant tokens for debugging
      console.log('Participants for push:', participants.map(p => ({
        userId: p.userId,
        pushToken: (p.user as any)?.pushToken || null
      })));

      participants.forEach(p => {
        // @ts-ignore pushToken may not exist on user type yet
        const token = (p.user as any).pushToken;
        if (!token || token === '') {
          console.log(`no push token for user ${p.userId}`);
        }
        if (token && token !== '' && p.userId !== userId) {
          let bodyText = '';
          if (message.type === 'text') {
            bodyText = message.content;
          } else if (message.type === 'image') {
            bodyText = '📷 Ảnh';
          } else if (message.type === 'file') {
            try {
              const info = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
              bodyText = `📎 ${info?.name || 'Tệp'}`;
            } catch {
              bodyText = '📎 Tệp';
            }
          }
          pushMessages.push({
            to: token,
            sound: 'default',
            title: message.sender?.fullName || 'Tin nhắn mới',
            body: bodyText,
            data: { conversationId: convId }
          });
        }
      });

      console.log('pushMessages built:', pushMessages);

      const chunks = expo.chunkPushNotifications(pushMessages);
      for (const chunk of chunks) {
        try {
          const receipt = await expo.sendPushNotificationsAsync(chunk);
          console.log('expo push chunk results:', receipt);
        } catch (err) {
          console.error('Error sending expo push chunk:', err);
        }
      }
    } catch (err) {
      console.error('Failed to send push notifications:', err);
    }

    return res.status(201).json(message);
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ message: 'Error sending message' });
  }
};
