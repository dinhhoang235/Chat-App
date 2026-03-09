import { Request, Response } from 'express';
import prisma from '../../db.js';

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
