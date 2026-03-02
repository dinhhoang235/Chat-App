import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: 'Phone and password are required' });
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
    res.json({ success: true, user: { ...userWithoutPassword, gender: user.gender ?? null, dateOfBirth: user.dateOfBirth ?? null }, accessToken, refreshToken });
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
    res.status(201).json({ success: true, user: { ...userWithoutPassword, gender: null, dateOfBirth: null }, accessToken, refreshToken });
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
    const { phone, fullName, password, avatar, bio } = req.body;
    
    if (!phone || !fullName || !password) {
      res.status(400).json({ error: 'Phone, fullName and password are required' });
      return;
    }

    const user = await prisma.user.create({
      data: { phone, fullName, password, avatar, bio },
      select: {
        id: true,
        phone: true,
        fullName: true,
        avatar: true,
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
    const { fullName, avatar, bio, gender, dateOfBirth } = req.body;

    // Only include fields that are provided
    const data: any = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (avatar !== undefined) data.avatar = avatar;
    if (bio !== undefined) data.bio = bio;
    if (gender !== undefined) data.gender = gender;
    if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

    const user = await prisma.user.update({
      where: { id: parseInt(id as string) },
      data,
      select: {
        id: true,
        phone: true,
        fullName: true,
        avatar: true,
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
