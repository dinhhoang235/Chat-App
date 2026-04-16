import { Request, Response } from "express";
import prisma from "../../db.js";
import { getUserStatus } from "../../utils/redis.js";

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

    const usersWithStatus = await Promise.all(
      users.map(async (u: { id: number }) => {
        const status = await getUserStatus(u.id);
        return {
          ...u,
          status: status === "online" ? "online" : "offline",
        };
      }),
    );

    res.json(usersWithStatus);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
