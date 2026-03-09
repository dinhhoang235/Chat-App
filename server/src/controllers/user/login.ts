import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../db.js';
import { generateTokens } from '../../utils/jwt.js';

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
