import { Request, Response } from "express";
import prisma from "../../db.js";
import { getUserStatusStructured } from "../../utils/redis.js";

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
        const structured = await getUserStatusStructured(u.id);
        return {
          ...u,
          status: structured ? structured.status : "offline",
        };
      }),
    );

    res.json(usersWithStatus);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
