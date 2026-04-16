import { Request, Response } from "express";
import prisma from "../../db.js";

// Tìm kiếm user - bạn bè có thể tìm theo tên và số điện thoại, người lạ chỉ tìm theo số điện thoại chính xác
export const searchUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { query } = req.query;

    if (!query) {
      res.status(400).json({ error: "Search query is required" });
      return;
    }

    const searchQuery = (query as string).trim();

    if (searchQuery.length === 0) {
      res.status(400).json({ error: "Search query cannot be empty" });
      return;
    }

    // Check if query is a phone number (contains only digits)
    const phoneRegex = /^[0-9]{10}$/;
    const isPhoneQuery = phoneRegex.test(searchQuery);

    // Get user's friends list
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true },
    });

    const friendIds = friendships.map((f: { friendId: number }) => f.friendId);
    const isFriend = (id: number) => friendIds.includes(id);

    let results: any[] = [];

    if (isPhoneQuery) {
      // If searching by phone number, first search friends, then all users if not found in friends

      // Search in friends first
      const friendUser = await prisma.user.findUnique({
        where: { phone: searchQuery },
        select: {
          id: true,
          phone: true,
          fullName: true,
          avatar: true,
          bio: true,
          gender: true,
          dateOfBirth: true,
        },
      });

      if (friendUser && friendUser.id !== userId) {
        // Check friend request status
        const friendRequest = await prisma.friendRequest.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: friendUser.id },
              { senderId: friendUser.id, receiverId: userId },
            ],
          },
        });

        results.push({
          ...friendUser,
          isFriend: isFriend(friendUser.id),
          requestStatus: friendRequest?.status || null,
          requestDirection: friendRequest
            ? friendRequest.senderId === userId
              ? "sent"
              : "received"
            : null,
          source: "friend", // Found in friends list
        });
      }

      // If not found in friends or want to search all, search all users with exact phone match
      if (results.length === 0) {
        const allUser = await prisma.user.findUnique({
          where: { phone: searchQuery },
          select: {
            id: true,
            phone: true,
            fullName: true,
            avatar: true,
            bio: true,
            gender: true,
            dateOfBirth: true,
          },
        });

        if (allUser && allUser.id !== userId) {
          // Check friend request status
          const friendRequest = await prisma.friendRequest.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: allUser.id },
                { senderId: allUser.id, receiverId: userId },
              ],
            },
          });

          results.push({
            ...allUser,
            isFriend: isFriend(allUser.id),
            requestStatus: friendRequest?.status || null,
            requestDirection: friendRequest
              ? friendRequest.senderId === userId
                ? "sent"
                : "received"
              : null,
            source: "stranger", // Found but not in friends
          });
        }
      }
    } else {
      // If searching by name, only search in friends
      const friendUsers = await prisma.user.findMany({
        where: {
          id: { in: friendIds },
          fullName: {
            contains: searchQuery,
          },
        },
        select: {
          id: true,
          phone: true,
          fullName: true,
          avatar: true,
          bio: true,
          gender: true,
          dateOfBirth: true,
        },
      });

      results = friendUsers.map(
        (user: {
          id: number;
          phone: string;
          fullName: string;
          avatar: string | null;
          bio: string | null;
          gender: string | null;
          dateOfBirth: Date | null;
        }) => ({
          ...user,
          isFriend: true,
          requestStatus: null,
          requestDirection: null,
          source: "friend",
        }),
      );
    }

    res.json({
      success: true,
      query: searchQuery,
      isPhoneQuery,
      data: results,
    });
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
};
