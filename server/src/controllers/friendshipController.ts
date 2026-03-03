import { Request, Response } from 'express';
import prisma from '../db.js';

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
  } catch (err) {
    console.error('Error accepting friend request:', err);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
};

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

// Lấy danh sách lời mời kết bạn chưa xử lý (nhận được)
export const getPendingFriendRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'pending'
      },
      include: {
        sender: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatar: true,
            bio: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error('Error fetching pending requests:', err);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
};

// Lấy danh sách lời mời kết bạn đã gửi
export const getSentFriendRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId
      },
      include: {
        receiver: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatar: true,
            bio: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error('Error fetching sent requests:', err);
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
};

// Lấy danh sách bạn bè
export const getFriendsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const friendships = await prisma.friendship.findMany({
      where: {
        userId
      },
      include: {
        friend: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatar: true,
            bio: true,
            gender: true,
            dateOfBirth: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const friends = friendships.map(f => f.friend);

    res.json({
      success: true,
      data: friends
    });
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
};

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
