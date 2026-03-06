import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { getUserStatus } from '../utils/redis.js';
import fs from 'fs';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: 'Phone and password are required' });
      return;
    }

    // Validate phone number format (must be exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    // Compare provided password with hashed password in database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid phone or password' });
      return;
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: { ...userWithoutPassword, coverImage: user.coverImage ?? null, gender: user.gender ?? null, dateOfBirth: user.dateOfBirth ?? null }, accessToken, refreshToken });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, fullName, password } = req.body;

    if (!phone || !fullName || !password) {
      res.status(400).json({ error: 'Phone, fullName, and password are required' });
      return;
    }

    // Validate phone number format (must be exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
      return;
    }

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Phone number already registered' });
      return;
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { phone, fullName, password: hashedPassword }
    });

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ success: true, user: { ...userWithoutPassword, coverImage: null, gender: null, dateOfBirth: null }, accessToken, refreshToken });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to signup' });
  }
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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

    const usersWithStatus = await Promise.all(users.map(async (u) => {
      const status = await getUserStatus(u.id);
      return {
        ...u,
        status: status === 'online' ? 'online' : 'offline'
      };
    }));

    res.json(usersWithStatus);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

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

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, fullName, password, avatar, coverImage, bio } = req.body;
    
    if (!phone || !fullName || !password) {
      res.status(400).json({ error: 'Phone, fullName and password are required' });
      return;
    }

    const user = await prisma.user.create({
      data: { phone, fullName, password, avatar, coverImage, bio },
      select: {
        id: true,
        phone: true,
        fullName: true,
        avatar: true,
        coverImage: true,
        bio: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(user);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = parseInt(id as string);
    const files = (req as any).files || [];

    // Handle multipart/form-data where req.body might be undefined
    const body = req.body || {};
    const { fullName, bio, gender, dateOfBirth } = body;

    // Get current user to check old images
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, coverImage: true }
    });

    // Only include fields that are provided
    const data: any = {};
    if (fullName !== undefined && fullName !== null && fullName !== '') data.fullName = fullName;
    if (bio !== undefined && bio !== null) data.bio = bio;
    if (gender !== undefined && gender !== null && gender !== '') data.gender = gender;
    if (dateOfBirth !== undefined && dateOfBirth !== null) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

    // Handle file uploads
    for (const file of files) {
      const fieldName = file.fieldname; // 'avatar' or 'coverImage'
      const filePath = `/media/${fieldName === 'avatar' ? 'avatars' : 'covers'}/${file.filename}`;
      
      data[fieldName] = filePath;

      // Delete old file if it exists
      if (fieldName === 'avatar' && currentUser?.avatar) {
        try {
          // Reconstruct file system path from media path
          const mediaPath = currentUser.avatar.replace('/media/', '');
          const fullPath = `${__dirname}/../../media/${mediaPath}`;
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      } else if (fieldName === 'coverImage' && currentUser?.coverImage) {
        try {
          // Reconstruct file system path from media path
          const mediaPath = currentUser.coverImage.replace('/media/', '');
          const fullPath = `${__dirname}/../../media/${mediaPath}`;
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error('Error deleting old cover image:', err);
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
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

    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    if (err instanceof Error) {
      res.status(500).json({ error: 'Failed to update user', details: err.message });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: parseInt(id as string) }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: oldRefreshToken } = req.body;

    if (!oldRefreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const decoded = verifyRefreshToken(oldRefreshToken);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

export const saveSearchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { searchedUserId } = req.body;

    if (!searchedUserId) {
      res.status(400).json({ error: 'searchedUserId is required' });
      return;
    }

    const sid = parseInt(searchedUserId as string);

    // Don't save self-search
    if (userId === sid) {
      res.json({ success: true, message: 'Self-search not stored' });
      return;
    }

    //upsert search history
    await prisma.searchHistory.upsert({
      where: {
        userId_searchedUserId: {
          userId,
          searchedUserId: sid
        }
      },
      update: {
        updatedAt: new Date()
      },
      create: {
        userId,
        searchedUserId: sid
      }
    });

    // Tối ưu: Chỉ giữ lại 20 tìm kiếm gần nhất để database không bị phình to
    const count = await prisma.searchHistory.count({
      where: { userId }
    });

    if (count > 20) {
      const oldestHistory = await prisma.searchHistory.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'asc' }
      });

      if (oldestHistory) {
        await prisma.searchHistory.delete({
          where: { id: oldestHistory.id }
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving search history:', err);
    res.status(500).json({ error: 'Failed to save search history' });
  }
};

export const getSearchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        searchedUser: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatar: true,
            bio: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: history.map(h => h.searchedUser)
    });
  } catch (err) {
    console.error('Error fetching search history:', err);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
};

export const deleteSearchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { searchedUserId } = req.body;

    if (!searchedUserId) {
      res.status(400).json({ error: 'searchedUserId is required' });
      return;
    }

    await prisma.searchHistory.delete({
      where: {
        userId_searchedUserId: {
          userId,
          searchedUserId: parseInt(searchedUserId as string)
        }
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting search history:', err);
    res.status(500).json({ error: 'Failed to delete search history' });
  }
};

export const clearSearchHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    await prisma.searchHistory.deleteMany({
      where: { userId }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing search history:', err);
    res.status(500).json({ error: 'Failed to clear search history' });
  }
};

// Tìm kiếm user - bạn bè có thể tìm theo tên và số điện thoại, người lạ chỉ tìm theo số điện thoại chính xác
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { query } = req.query;

    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const searchQuery = (query as string).trim();

    if (searchQuery.length === 0) {
      res.status(400).json({ error: 'Search query cannot be empty' });
      return;
    }

    // Check if query is a phone number (contains only digits)
    const phoneRegex = /^[0-9]{10}$/;
    const isPhoneQuery = phoneRegex.test(searchQuery);

    // Get user's friends list
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true }
    });

    const friendIds = friendships.map(f => f.friendId);
    const isFriend = (id: number) => friendIds.includes(id);

    let results: any[] = [];

    if (isPhoneQuery) {
      // If searching by phone number, first search friends, then all users if not found in friends
      
      // Search in friends first
      const friendUser = await prisma.user.findUnique({
        where: { phone: searchQuery },
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

      if (friendUser && friendUser.id !== userId) {
        // Check friend request status
        const friendRequest = await prisma.friendRequest.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: friendUser.id },
              { senderId: friendUser.id, receiverId: userId }
            ]
          }
        });

        results.push({
          ...friendUser,
          isFriend: isFriend(friendUser.id),
          requestStatus: friendRequest?.status || null,
          requestDirection: friendRequest ? (friendRequest.senderId === userId ? 'sent' : 'received') : null,
          source: 'friend' // Found in friends list
        });
      }

      // If not found in friends or want to search all, search all users with exact phone match
      if (results.length === 0) {
        const allUser = await prisma.user.findUnique({
          where: { phone: searchQuery },
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

        if (allUser && allUser.id !== userId) {
          // Check friend request status
          const friendRequest = await prisma.friendRequest.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: allUser.id },
                { senderId: allUser.id, receiverId: userId }
              ]
            }
          });

          results.push({
            ...allUser,
            isFriend: isFriend(allUser.id),
            requestStatus: friendRequest?.status || null,
            requestDirection: friendRequest ? (friendRequest.senderId === userId ? 'sent' : 'received') : null,
            source: 'stranger' // Found but not in friends
          });
        }
      }
    } else {
      // If searching by name, only search in friends
      const friendUsers = await prisma.user.findMany({
        where: {
          id: { in: friendIds },
          fullName: {
            contains: searchQuery
          }
        },
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

      results = friendUsers.map(user => ({
        ...user,
        isFriend: true,
        requestStatus: null,
        requestDirection: null,
        source: 'friend'
      }));
    }

    res.json({
      success: true,
      query: searchQuery,
      isPhoneQuery,
      data: results
    });
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
};
