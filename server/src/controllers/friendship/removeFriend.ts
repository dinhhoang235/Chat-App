import { Request, Response } from 'express';
import prisma from '../../db.js';

// Xóa bạn
export const removeFriend = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { friendId } = req.body;

    if (!friendId) {
      res.status(400).json({ error: 'friendId is required' });
      return;
    }

    await Promise.all([
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId }
          ]
        }
      }),
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: userId, receiverId: friendId },
            { senderId: friendId, receiverId: userId }
          ]
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (err) {
    console.error('Error removing friend:', err);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
};
