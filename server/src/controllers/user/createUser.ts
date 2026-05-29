import { Request, Response } from "express";
import prisma from "../../db.js";
import { bucketName } from "../../utils/minio.js";

export const createUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { phone, fullName, password, avatar, coverImage, bio } = req.body;

    if (!phone || !fullName || !password) {
      res
        .status(400)
        .json({ error: "Phone, fullName and password are required" });
      return;
    }

    const defaultAvatarPath =
      process.env.DEFAULT_USER_AVATAR ||
      `/storage/${bucketName}/default_avatar.png`;

    const user = await prisma.user.create({
      data: {
        phone,
        fullName,
        password,
        avatar: avatar || defaultAvatarPath,
        coverImage,
        bio,
      },
      select: {
        id: true,
        phone: true,
        fullName: true,
        avatar: true,
        coverImage: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
};
