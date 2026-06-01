import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../db.js";
import { generateTokens } from "../../utils/jwt.js";
import { bucketName } from "../../utils/minio.js";

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, fullName, password } = req.body;

    if (!phone || !fullName || !password) {
      res
        .status(400)
        .json({ error: "Phone, fullName, and password are required" });
      return;
    }

    // Validate phone number format (must be exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      res.status(400).json({ error: "Phone number must be exactly 10 digits" });
      return;
    }

    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      res.status(400).json({ error: "Phone number already registered" });
      return;
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Use server-stored default avatar if provided via env, otherwise fall back to a path in object storage
    const defaultAvatarPath =
      process.env.DEFAULT_USER_AVATAR || ``;

    const user = await prisma.user.create({
      data: {
        phone,
        fullName,
        password: hashedPassword,
        avatar: defaultAvatarPath,
      },
    });

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      success: true,
      user: {
        ...userWithoutPassword,
        coverImage: null,
        gender: null,
        dateOfBirth: null,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to signup" });
  }
};
