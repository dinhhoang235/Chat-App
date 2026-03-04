import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
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
    res.json(users);
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
    
    res.json(user);
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
