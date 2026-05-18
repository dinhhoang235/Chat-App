import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { clearCachedMessages } from "../../utils/redis.js";

export const editMessage =
  (io: Server) =>
  async (req: AuthRequest, res: Response): Promise<any> => {
    const { conversationId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const convId = Number(conversationId);
    const msgId = Number(messageId);
    const nextContent = typeof content === "string" ? content.trim() : "";

    if (!nextContent) {
      return res.status(400).json({ message: "Message content is required" });
    }

    try {
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: convId,
            userId,
          },
        },
      });

      if (!participant) {
        return res.status(403).json({ message: "Not a member of this conversation" });
      }

      const message = await prisma.message.findFirst({
        where: {
          id: msgId,
          conversationId: convId,
        },
      });

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      if (message.senderId !== userId) {
        return res.status(403).json({ message: "You can only edit your own messages" });
      }

      if (message.isRevoked) {
        return res.status(400).json({ message: "Cannot edit a revoked message" });
      }

      if (message.type !== "text") {
        return res.status(400).json({ message: "Only text messages can be edited" });
      }

      const updated = await prisma.message.update({
        where: { id: msgId },
        data: { content: nextContent },
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
      });

      io.to(`conversation:${convId}`).emit("message_edited", {
        message: updated,
        conversationId: convId,
      });

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId },
        select: { userId: true },
      });

      participants.forEach((participant) => {
        io.to(`user:${participant.userId}`).emit("conversation_updated", {
          conversationId: convId,
          action: "message_edited",
          messageId: msgId,
        });
      });

      clearCachedMessages(convId).catch(() => {});

      return res.json(updated);
    } catch (err) {
      console.error("Edit message error:", err);
      return res.status(500).json({ message: "Error editing message" });
    }
  };
