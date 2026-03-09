import { Request, Response } from 'express';
import prisma from '../../db.js';

// Kiểm tra trạng thái bạn bè
export const checkFriendshipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { targetUserId } = req.params;
    const targetId = parseInt(targetUserId as string);

    if (!targetId) {
      res.status(400).json({ error: 'targetUserId is required' });
      return;
    }

    const isFriend = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId,
          friendId: targetId
        }
      }
    });

    if (isFriend) {
      res.json({ status: 'friend' });
      return;
    }

    const sentRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId: targetId
        }
      }
    });

    if (sentRequest) {
      res.json({ status: 'request_sent', requestStatus: sentRequest.status });
      return;
    }

    const receivedRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: targetId,
          receiverId: userId
        }
      }
    });

    if (receivedRequest) {
      res.json({ status: 'request_received', requestStatus: receivedRequest.status });
      return;
    }

    res.json({ status: 'none' });
  } catch (err) {
    console.error('Error checking friendship status:', err);
    res.status(500).json({ error: 'Failed to check friendship status' });
  }
};
