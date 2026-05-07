import { Response } from "express";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { getUsersStatusStructured } from "../../utils/redis.js";

type ConversationParticipantWithUser = {
  userId: number;
  deletedAt: Date | null;
  lastReadAt: Date | null;
  isPinned: boolean | null;
  mutedUntil: Date | null;
  role: string;
  isMarkedUnread: boolean | null;
  user: {
    id: number;
    fullName: string | null;
    avatar: string | null;
    phone: string | null;
  };
};

export const getConversations = async (
  req: AuthRequest,
  res: Response,
): Promise<any> => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            hiddenAt: null,
          },
        },
      },
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
        messages: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Manually calculate unread count and add user status for each conversation
    // OPTIMIZATION: Batch fetch all user statuses in ONE Redis call instead of N calls per conversation
    const allUserIds = new Set<number>();
    conversations.forEach((conv) => {
      conv.participants.forEach((p) => {
        allUserIds.add(p.userId);
      });
    });

    // Fetch all user statuses at once (reduces from ~150 Redis calls to 1-2 calls)
    const userStatusMap = await getUsersStatusStructured(
      Array.from(allUserIds),
    );

    const mappedConversations = await Promise.all(
      conversations.map(
        async (conv: {
          participants: ConversationParticipantWithUser[];
          messages: any[];
          id: number;
          updatedAt: Date;
        }) => {
          const participant = conv.participants.find(
            (p: ConversationParticipantWithUser) => p.userId === userId,
          );
          const deletedAt = participant?.deletedAt || new Date(0);

          // Filter messages to only show those created after deletedAt
          const lastMessage =
            conv.messages.length > 0 && conv.messages[0].createdAt > deletedAt
              ? conv.messages
              : [];

          const unreadCount = await prisma.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              createdAt: {
                gt:
                  participant?.lastReadAt && participant.lastReadAt > deletedAt
                    ? participant.lastReadAt
                    : deletedAt,
              },
            },
          });

          // Add status for each participant - NOW just lookup from pre-fetched map
          const participantsWithStatus = conv.participants.map(
            (p: ConversationParticipantWithUser) => {
              const structured = userStatusMap.get(p.userId) || {
                status: "offline",
                lastSeen: null,
              };
              const isOnline = structured.status === "online";
              return {
                ...p,
                user: {
                  ...p.user,
                  status: isOnline ? "online" : "offline",
                  lastSeen: structured.lastSeen,
                },
              };
            },
          );

          return {
            ...conv,
            isPinned: !!participant?.isPinned,
            messages: lastMessage.map((msg: any) => {
              // Compute seenBy for initial messages just like in getMessages
              const seenBy = msg.senderId
                ? participantsWithStatus
                    .filter(
                      (p: any) =>
                        p.userId !== msg.senderId &&
                        new Date(p.lastReadAt || 0).getTime() >
                          new Date(msg.createdAt).getTime(),
                    )
                    .map((p: any) => ({
                      id: p.user.id,
                      fullName: p.user.fullName,
                      avatar: p.user.avatar
                        ? p.user.avatar.startsWith("http")
                          ? p.user.avatar
                          : p.user.avatar
                        : null,
                    }))
                : [];
              return { ...msg, seenBy, fromMe: msg.senderId === userId };
            }),
            participants: participantsWithStatus,
            membersCount: conv.participants.length,
            _count: {
              messages: participant?.isMarkedUnread
                ? Math.max(1, unreadCount)
                : unreadCount,
            },
          };
        },
      ),
    );

    const sortedConversations = [...mappedConversations].sort(
      (a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      },
    );

    return res.json(sortedConversations);
  } catch (err) {
    console.error("Get conversations error:", err);
    return res.status(500).json({ message: "Error fetching conversations" });
  }
};
