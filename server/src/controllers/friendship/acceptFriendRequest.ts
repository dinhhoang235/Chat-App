import { Request, Response } from 'express';
import prisma from '../../db.js';
import { sendPushNotifications } from '../../utils/notification.js';

// Chấp nhận lời mời kết bạn
export const acceptFriendRequest = async (req: Request, res: Response): Promise<void> => {
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
      res.status(400).json({ error: `Cannot accept a ${friendRequest.status} request` });
      return;
    }

    await prisma.friendRequest.update({
      where: { id: friendRequest.id },
      data: { status: 'accepted' }
    });

    await Promise.all([
      prisma.friendship.create({
        data: {
          userId: senderId,
          friendId: receiverId
        }
      }),
      prisma.friendship.create({
        data: {
          userId: receiverId,
          friendId: senderId
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Friend request accepted'
    });

    // Send notification to the sender
    try {
      const [sender, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: senderId }, select: { pushToken: true } }),
        prisma.user.findUnique({ where: { id: receiverId }, select: { fullName: true } })
      ]);

      if (sender?.pushToken && receiver) {
        await sendPushNotifications([sender.pushToken], {
          title: 'Chấp nhận kết bạn',
          body: `${receiver.fullName} đã chấp nhận lời mời kết bạn`,
          data: { type: 'friend_accepted', userId: receiverId }
        });
      }
    } catch (err) {
      console.error('Error sending acceptance notification:', err);
    }
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
};
