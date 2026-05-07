import { Request, Response } from "express";
import prisma from "../../db.js";
import { getUsersStatusStructured } from "../../utils/redis.js";

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

    // OPTIMIZATION #7: Use batch status query instead of individual queries
    const friendIds = friends.map((f) => f.id);
    const friendStatusMap = await getUsersStatusStructured(friendIds);

    const friendsWithStatus = friends.map((f) => ({
      ...f,
      status: (friendStatusMap.get(f.id) || { status: "offline" }).status,
    }));

    res.json({
      success: true,
      data: friendsWithStatus,
    });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
};
