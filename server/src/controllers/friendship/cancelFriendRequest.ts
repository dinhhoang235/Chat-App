import { Request, Response } from 'express';
import prisma from '../../db.js';

// Hủy lời mời kết bạn (user đã gửi hủy)
export const cancelFriendRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = (req as any).userId;
    const { receiverId } = req.body;

    if (!receiverId) {
      res.status(400).json({ error: 'receiverId is required' });
      return;
    }

    const friendRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId
        }
      }
    });

    if (!friendRequest) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    await prisma.friendRequest.delete({
      where: { id: friendRequest.id }
    });

    res.json({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (err) {
    console.error('Error cancelling friend request:', err);
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
};
