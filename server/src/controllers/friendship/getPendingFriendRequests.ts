import { Request, Response } from 'express';
import prisma from '../../db.js';

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
