import { Request, Response } from 'express';
import prisma from '../../db.js';

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
