import { Request, Response } from "express";
import prisma from "../../db.js";
import { getUsersStatusStructured } from "../../utils/redis.js";

export const getAllUsers = async (
  _req: Request,
  res: Response,
): Promise<void> => {
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
        updatedAt: true,
      },
    });

    // OPTIMIZATION #7: Use batch status query instead of individual queries
    const userIds = users.map((u: { id: number }) => u.id);
    const userStatusMap = await getUsersStatusStructured(userIds);

    const usersWithStatus = users.map((u: any) => ({
      ...u,
      status: (userStatusMap.get(u.id) || { status: "offline" }).status,
    }));

    res.json(usersWithStatus);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
