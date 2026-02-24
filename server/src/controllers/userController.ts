import { Request, Response } from 'express';
import prisma from '../db.js';

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany();
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
      include: { chats: true, sentMessages: true }
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
    const { email, name, avatar, bio } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.create({
      data: { email, name, avatar, bio }
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
    const { email, name, avatar, bio } = req.body;

    const user = await prisma.user.update({
      where: { id: parseInt(id as string) },
      data: { email, name, avatar, bio }
    });

    res.json(user);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to update user' });
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
