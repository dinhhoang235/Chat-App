import { Request, Response } from "express";
import prisma from "../../db.js";
import { getUserStatusStructured } from "../../utils/redis.js";

// Lấy danh sách bạn bè
export const getFriendsList = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const friendships = await prisma.friendship.findMany({
      where: {
        userId,
      },
      include: {
        friend: {
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatar: true,
            bio: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const friends = friendships.map((f) => f.friend);

    const friendsWithStatus = await Promise.all(
      friends.map(async (f) => {
        const structured = await getUserStatusStructured(f.id);
        return {
          ...f,
          status: structured ? structured.status : "offline",
        };
      }),
    );

    res.json({
      success: true,
      data: friendsWithStatus,
    });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
};
