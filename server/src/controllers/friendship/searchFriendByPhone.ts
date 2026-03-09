import { Request, Response } from 'express';
import prisma from '../../db.js';

// Tìm kiếm bạn theo số điện thoại
export const searchFriendByPhone = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { phone } = req.query;

    if (!phone) {
      res.status(400).json({ error: 'phone is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { phone: phone as string },
      select: {
        id: true,
        phone: true,
        fullName: true,
        avatar: true,
        bio: true,
        gender: true,
        dateOfBirth: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.id === userId) {
      res.status(400).json({ error: 'Cannot search for yourself' });
      return;
    }

    const isFriend = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId,
          friendId: user.id
        }
      }
    });

    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: user.id },
          { senderId: user.id, receiverId: userId }
        ]
      }
    });

    res.json({
      success: true,
      data: {
        ...user,
        friendshipStatus: isFriend ? 'friend' : friendRequest ? 'request_pending' : 'none'
      }
    });
  } catch (err) {
    console.error('Error searching friend:', err);
    res.status(500).json({ error: 'Failed to search friend' });
  }
};
