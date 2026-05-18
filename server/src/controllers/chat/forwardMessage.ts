import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { cacheMessage, clearCachedMessages } from "../../utils/redis.js";

export const forwardMessage =
  (io: Server) =>
  async (req: AuthRequest, res: Response): Promise<any> => {
    const { conversationId, messageId } = req.params;
    const { targetConversationIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sourceConversationId = Number(conversationId);
    const sourceMessageId = Number(messageId);
    const targetIds = Array.isArray(targetConversationIds)
      ? targetConversationIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      : [];
    const uniqueTargetIds = Array.from(new Set(targetIds));

    if (uniqueTargetIds.length === 0) {
      return res.status(400).json({ message: "Select at least one conversation" });
    }

    try {
      console.log('[forwardMessage] request', {
        userId,
        conversationId: sourceConversationId,
        messageId: sourceMessageId,
        targetConversationIds: targetConversationIds,
      });
      const sourceParticipant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: sourceConversationId,
            userId,
          },
        },
      });

      if (!sourceParticipant) {
        return res.status(403).json({ message: "Not a member of this conversation" });
      }

      let sourceMessage = await prisma.message.findFirst({
        where: {
          id: sourceMessageId,
          conversationId: sourceConversationId,
          deletedBy: {
            none: { userId },
          },
        },
      });
      let actualSourceConversationId = sourceConversationId;

      if (!sourceMessage) {
        const fallbackMessage = await prisma.message.findUnique({
          where: { id: sourceMessageId },
          include: { deletedBy: true },
        });

        if (
          fallbackMessage &&
          !fallbackMessage.deletedBy.some((deletion) => deletion.userId === userId)
        ) {
          if (fallbackMessage.conversationId !== sourceConversationId) {
            const actualParticipant = await prisma.conversationParticipant.findUnique({
              where: {
                conversationId_userId: {
                  conversationId: fallbackMessage.conversationId,
                  userId,
                },
              },
            });

            if (!actualParticipant) {
              return res.status(403).json({ message: 'Not a member of this conversation' });
            }
          }
          sourceMessage = fallbackMessage as any;
          actualSourceConversationId = fallbackMessage.conversationId;
        }
      }

      if (!sourceMessage) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (sourceMessage.isRevoked || sourceMessage.type === "revoked") {
        return res.status(400).json({ message: "Cannot forward a revoked message" });
      }

      const memberships = await prisma.conversationParticipant.findMany({
        where: {
          userId,
          hiddenAt: null,
          conversationId: {
            in: uniqueTargetIds,
          },
        },
        select: {
          conversationId: true,
        },
      });

      const allowedTargetIds = memberships.map((item) => item.conversationId);
      if (allowedTargetIds.length !== uniqueTargetIds.length) {
        return res.status(403).json({ message: "You can only forward to your conversations" });
      }

      const createdMessages = await prisma.$transaction(
        allowedTargetIds.map((targetConversationId) =>
          prisma.message.create({
            data: {
              conversationId: targetConversationId,
              senderId: userId,
              content: sourceMessage.content,
              type: sourceMessage.type,
            },
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
            },
          }),
        ),
      );

      await prisma.conversation.updateMany({
        where: { id: { in: allowedTargetIds } },
        data: { updatedAt: new Date() },
      });

      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId: { in: allowedTargetIds },
          hiddenAt: { not: null },
        },
        data: { hiddenAt: null },
      });

      const targetParticipants = await prisma.conversationParticipant.findMany({
        where: { conversationId: { in: allowedTargetIds } },
        select: { conversationId: true, userId: true },
      });

      createdMessages.forEach((message) => {
        io.to(`conversation:${message.conversationId}`).emit("new_message", message);
        targetParticipants
          .filter((participant) => participant.conversationId === message.conversationId)
          .forEach((participant) => {
            io.to(`user:${participant.userId}`).emit("conversation_updated", {
              conversationId: message.conversationId,
              action: "message_forwarded",
              messageId: message.id,
              lastMessagePreview: {
                id: message.id,
                type: message.type,
                senderId: message.senderId,
              },
            });
          });
        cacheMessage(message.conversationId, message).catch(() => {});
        clearCachedMessages(message.conversationId).catch(() => {});
      });

      return res.status(201).json(createdMessages);
    } catch (err) {
      console.error("Forward message error:", err);
      return res.status(500).json({ message: "Error forwarding message" });
    }
  };
