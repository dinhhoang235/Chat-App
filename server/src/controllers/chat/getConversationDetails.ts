import { Response } from "express";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { getUsersStatusStructured } from "../../utils/redis.js";

type ConversationParticipantWithUser = {
  id: number;
  userId: number;
  role: string;
  lastReadAt: Date | null;
  joinedAt: Date;
  isPinned: boolean | null;
  mutedUntil: Date | null;
  user: {
    id: number;
    fullName: string | null;
    avatar: string | null;
    phone: string | null;
  };
};

export const getConversationDetails = async (
  req: AuthRequest,
  res: Response,
): Promise<any> => {
  const { conversationId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const convId = parseInt(
      Array.isArray(conversationId) ? conversationId[0] : conversationId,
    );

    const conversation = await prisma.conversation.findUnique({
      where: { id: convId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      (p: ConversationParticipantWithUser) => p.userId === userId,
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "Not a member of this conversation" });
    }

    // Add status for each participant
    // OPTIMIZATION #7: Use batch status query instead of individual queries
    const userIds = conversation.participants.map(
      (p: ConversationParticipantWithUser) => p.userId,
    );
    const userStatusMap = await getUsersStatusStructured(userIds);

    const participantsWithStatus = conversation.participants.map(
      (p: ConversationParticipantWithUser) => {
        const structured = userStatusMap.get(p.userId) || {
          status: "offline",
          lastSeen: null,
        };
        return {
          id: p.id,
          userId: p.userId,
          role: p.role,
          lastReadAt: p.lastReadAt,
          joinedAt: p.joinedAt,
          isPinned: p.isPinned,
          mutedUntil: p.mutedUntil,
          user: {
            ...p.user,
            status: structured.status,
          },
        };
      },
    );

    return res.json({
      ...conversation,
      participants: participantsWithStatus,
      membersCount: conversation.participants.length,
    });
  } catch (err) {
    console.error("Get conversation details error:", err);
    return res
      .status(500)
      .json({ message: "Error fetching conversation details" });
  }
};
