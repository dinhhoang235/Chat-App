import { Request, Response } from 'express';
import prisma from '../../db.js';

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
