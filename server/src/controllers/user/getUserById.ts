import { Request, Response } from 'express';
import prisma from '../../db.js';
import { getUserStatus } from '../../utils/redis.js';

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id as string) },
      select: {
        id: true,
        phone: true,
        fullName: true,
        avatar: true,
        coverImage: true,
        bio: true,
        gender: true,
        dateOfBirth: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Get real-time status from Redis
    const status = await getUserStatus(user.id);
    const isOnline = status === 'online';
    const lastSeen = !isOnline && status ? parseInt(status) : null;

    res.json({ 
      ...user, 
      status: isOnline ? 'online' : 'offline',
      lastSeen 
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
