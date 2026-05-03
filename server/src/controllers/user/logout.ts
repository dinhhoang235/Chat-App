import { Request, Response } from "express";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";

export const logout = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Clear the push token for this user when they logout
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: null },
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Failed to logout" });
  }
};
