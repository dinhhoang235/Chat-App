import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { bulkCacheMessages, getCachedMessages } from "../../utils/redis.js";

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
        select: {
          deletedAt: true,
        },
      });

      if (!participant) {
        return res
          .status(403)
          .json({ message: "Not a member of this conversation" });
      }

      const take = parseInt(limit as string);
      const cursorId = cursor ? parseInt(cursor as string) : undefined;
      const now = new Date();

      const loadMessagesFromDb = async () => {
        const messages = await prisma.message.findMany({
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
          orderBy: { id: "desc" },
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

        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId: convId },
          select: {
            userId: true,
            lastReadAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        });

        const seenByMap = new Map<number, any[]>();

        for (const participant of participants) {
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
                avatar: participant.user.avatar,
                seenAt: participant.lastReadAt,
              });
            }
          }
        }

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

        if (!cursor) {
          bulkCacheMessages(convId, messagesWithSeen).catch((e) =>
            console.error(e),
          );
        }

        return messagesWithSeen;
      };

      if (!cursor) {
        const cachedMessages = await getCachedMessages(convId, take);
        if (cachedMessages && cachedMessages.length > 0) {
          res.json(cachedMessages);

          void loadMessagesFromDb()
            .then(() => {
              void prisma.conversationParticipant
                .update({
                  where: {
                    conversationId_userId: {
                      conversationId: convId,
                      userId,
                    },
                  },
                  data: { lastReadAt: now },
                })
                .then(() => {
                  io.to(`conversation:${convId}`).emit("message_seen", {
                    conversationId: convId,
                    userId,
                    seenAt: now,
                  });
                })
                .catch((err) => {
                  console.error("Update lastReadAt error:", err);
                });
            })
            .catch((err) => {
              console.error("Background refresh error:", err);
            });

          return;
        }
      }

      const messagesWithSeen = await loadMessagesFromDb();

      res.json(messagesWithSeen);

      void prisma.conversationParticipant
        .update({
          where: {
            conversationId_userId: {
              conversationId: convId,
              userId,
            },
          },
          data: { lastReadAt: now },
        })
        .then(() => {
          io.to(`conversation:${convId}`).emit("message_seen", {
            conversationId: convId,
            userId,
            seenAt: now,
          });
        })
        .catch((err) => {
          console.error("Update lastReadAt error:", err);
        });

      return;
    } catch (err) {
      console.error("Get messages error:", err);
      return res.status(500).json({ message: "Error fetching messages" });
    }
  };
