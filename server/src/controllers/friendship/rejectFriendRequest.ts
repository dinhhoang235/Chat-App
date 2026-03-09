import { Request, Response } from 'express';
import prisma from '../../db.js';

// Từ chối lời mời kết bạn
export const rejectFriendRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const receiverId = (req as any).userId;
    const { senderId } = req.body;

    if (!senderId) {
      res.status(400).json({ error: 'senderId is required' });
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

    if (friendRequest.status !== 'pending') {
      res.status(400).json({ error: `Cannot reject a ${friendRequest.status} request` });
      return;
    }

    await prisma.friendRequest.update({
      where: { id: friendRequest.id },
      data: { status: 'rejected' }
    });

    res.json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (err) {
    console.error('Error rejecting friend request:', err);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
};
