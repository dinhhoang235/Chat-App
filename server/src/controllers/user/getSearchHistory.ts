import { Request, Response } from "express";
import prisma from "../../db.js";

export const getSearchHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        searchedUser: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatar: true,
            bio: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: history.map(
        (h: { searchedUser: unknown }) => (h as any).searchedUser,
      ),
    });
  } catch (err) {
    console.error("Error fetching search history:", err);
    res.status(500).json({ error: "Failed to fetch search history" });
  }
};
