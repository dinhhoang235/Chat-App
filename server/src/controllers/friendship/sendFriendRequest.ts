import { Request, Response } from 'express';
import prisma from '../../db.js';

// Gửi lời mời kết bạn
export const sendFriendRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = (req as any).userId;
    const { receiverId } = req.body;

    if (!receiverId) {
      res.status(400).json({ error: 'receiverId is required' });
      return;
    }

    if (senderId === receiverId) {
      res.status(400).json({ error: 'Cannot send friend request to yourself' });
      return;
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    });

    if (existingRequest) {
      // If the existing request (regardless of who sent it) was rejected or is from the other side, 
      // we clean it up or update it to start fresh from the current sender
      if (existingRequest.status === 'rejected' || existingRequest.receiverId === receiverId) {
        // If it was already a request from me to them, just update it
        if (existingRequest.senderId === senderId) {
          const updatedRequest = await prisma.friendRequest.update({
            where: { id: existingRequest.id },
            data: { status: 'pending', updatedAt: new Date() },
            include: {
              sender: { select: { id: true, phone: true, fullName: true, avatar: true } },
              receiver: { select: { id: true, phone: true, fullName: true, avatar: true } }
            }
          });
          res.status(200).json({
            success: true,
            message: 'Friend request updated successfully',
            data: updatedRequest
          });
          return;
        } else {
          // If the old request was from them to me, delete it and create a new one from me to them
          await prisma.friendRequest.delete({
            where: { id: existingRequest.id }
          });
          // Continue to create a new request below
        }
      } else if (existingRequest.status === 'pending') {
        res.status(400).json({ error: 'Friend request already exists' });
        return;
      }
    }

    const isAlreadyFriend = await prisma.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: senderId,
          friendId: receiverId
        }
      }
    });

    if (isAlreadyFriend) {
      res.status(400).json({ error: 'Already friends' });
      return;
    }

    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId
      },
      include: {
        sender: {
          select: { id: true, phone: true, fullName: true, avatar: true }
        },
        receiver: {
          select: { id: true, phone: true, fullName: true, avatar: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      data: friendRequest
    });
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
};
