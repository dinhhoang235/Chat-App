import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { bulkCacheMessages } from "../../utils/redis.js";

type MessageWithSender = {
  id: number;
  type: string;
  content: string;
  createdAt: Date;
  senderId: number | null;
  sender: {
    id: number;
    fullName: string;
    avatar: string | null;
  } | null;
  reactions?: any[];
};

export const getMessages =
  (io: Server) =>
  async (req: AuthRequest, res: Response): Promise<any> => {
    const { conversationId } = req.params;
    const { cursor, limit = "20" } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const convId = parseInt(
        Array.isArray(conversationId) ? conversationId[0] : conversationId,
      );

      // Check if user is participant
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: convId,
            userId,
          },
        },
        include: {
          user: {
            select: {
              fullName: true,
              avatar: true,
            },
          },
        },
      });

      if (!participant) {
        return res
          .status(403)
          .json({ message: "Not a member of this conversation" });
      }

      const take = parseInt(limit as string);
      const cursorId = cursor ? parseInt(cursor as string) : undefined;

      let messages;
      let fromCache = false;

      // 1. Try to get from Cache if it's the first page (no cursor)
      // NOTE: We disable cache if we want accurate per-user deletion filtering,
      // or we can filter cached messages. For simplicity and correctness with per-user deletion, 
      // let's fetch from DB if we don't have a sophisticated cache strategy for deletions.
      /*
      if (!cursor) {
        ...
      }
      */
      if (!messages) {
        messages = await prisma.message.findMany({
          where: {
            conversationId: convId,
            createdAt: {
              gt: participant.deletedAt || new Date(0),
            },
            deletedBy: {
              none: {
                userId: userId,
              },
            },
          },
          take: take,
          skip: cursorId ? 1 : 0,
          cursor: cursorId ? { id: cursorId } : undefined,
          orderBy: { id: "desc" }, // Use ID for more reliable cursor pagination
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                type: true,
                sender: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            reactions: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        });
      }

      // Get participants to determine who has seen which messages
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatar: true,
            },
          },
        },
      });

      // OPTIMIZATION #2: Compute seenBy for all messages at once (O(N*M) single pass)
      // Instead of: messages.map() -> for each message, filter participants (separate operations)
      // Do: Pre-build seenBy map in one pass through participants for all messages
      const seenByMap = new Map<number, any[]>();

      for (const participant of participants) {
        // For each participant, check which messages they've seen
        for (const msg of messages) {
          if (
            msg.senderId &&
            msg.senderId !== participant.userId &&
            new Date(participant.lastReadAt).getTime() >
              new Date(msg.createdAt).getTime()
          ) {
            if (!seenByMap.has(msg.id)) {
              seenByMap.set(msg.id, []);
            }
            seenByMap.get(msg.id)!.push({
              id: participant.user.id,
              fullName: participant.user.fullName,
              avatar: participant.user.avatar
                ? participant.user.avatar.startsWith("http")
                  ? participant.user.avatar
                  : participant.user.avatar
                : null,
              seenAt: participant.lastReadAt,
            });
          }
        }
      }

      // Map messages to include seenBy info using pre-computed map and sort seenBy ascending
      const messagesWithSeen = messages.map((msg: MessageWithSender) => {
        const seenList = seenByMap.get(msg.id) || [];
        seenList.sort(
          (a, b) =>
            new Date(a.seenAt || 0).getTime() -
            new Date(b.seenAt || 0).getTime(),
        );
        return {
          ...msg,
          seenBy: seenList,
          fromMe: msg.senderId === userId,
        };
      });

      // 2. Cache first page if we just fetched it from DB (store raw messages, not computed seenBy)
      if (!cursor && !fromCache) {
        bulkCacheMessages(convId, messages).catch((e) => console.error(e));
      }

      const now = new Date();

      // Update lastReadAt
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: convId,
            userId,
          },
        },
        data: { lastReadAt: now },
      });

      // Notify other participants that this user has seen the messages
      io.to(`conversation:${convId}`).emit("message_seen", {
        conversationId: convId,
        userId,
        seenAt: now,
      });

      return res.json(messagesWithSeen);
    } catch (err) {
      console.error("Get messages error:", err);
      return res.status(500).json({ message: "Error fetching messages" });
    }
  };
