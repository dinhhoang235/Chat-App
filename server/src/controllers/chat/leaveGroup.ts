import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { clearCachedMessages } from "../../utils/redis.js";

export const leaveGroup =
  (io: Server) =>
  async (req: AuthRequest, res: Response): Promise<any> => {
    const { conversationId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const convId = parseInt(
        Array.isArray(conversationId) ? conversationId[0] : conversationId,
      );

      // 1. Get user details and conversation info
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: convId,
            userId,
          },
        },
        include: {
          conversation: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      });

      if (!participant) {
        return res.status(403).json({ message: "Not a member of this group" });
      }

      if (!participant.conversation.isGroup) {
        return res.status(400).json({ message: "Only groups can be left" });
      }

      // Create a "left group" system message BEFORE removing the participant
      const systemMessage = await prisma.message.create({
        data: {
          content: `${participant.user.fullName} đã rời nhóm`,
          type: "system",
          conversationId: convId,
          senderId: null, // System message
        },
      });

      // Broadcast system message to everyone in the conversation room
      io.to(`conversation:${convId}`).emit("new_message", {
        ...systemMessage,
        sender: null,
        fromMe: false,
        time: new Date(systemMessage.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        contactName: "Hệ thống",
      });

      // Clear cache to include system message
      clearCachedMessages(convId).catch((e) =>
        console.error("Clear cache error:", e),
      );

      // 2. If user is owner, transfer ownership to another member
      if (participant.role === "owner") {
        const otherParticipants = await prisma.conversationParticipant.findMany(
          {
            where: {
              conversationId: convId,
              userId: { not: userId },
            },
            orderBy: [
              { joinedAt: "asc" }, // oldest member first
            ],
          },
        );

        if (otherParticipants.length > 0) {
          // Transfer to the oldest member
          await prisma.conversationParticipant.update({
            where: { id: otherParticipants[0].id },
            data: { role: "owner" },
          });

          // Notify the new owner
          io.to(`user:${otherParticipants[0].userId}`).emit(
            "conversation_updated",
            {
              conversationId: convId,
              action: "role_changed",
              newRole: "owner",
              userId: otherParticipants[0].userId,
            },
          );
        }
      }

      const now = new Date();

      // 3. Delete the participant record (leaving the group)
      // AND update their deletedAt to clear history for them
      await prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: convId,
            userId,
          },
        },
        data: {
          deletedAt: now,
          hiddenAt: now,
        },
      });

      // Actually remove them after marking deletedAt
      await prisma.conversationParticipant.delete({
        where: {
          conversationId_userId: {
            conversationId: convId,
            userId,
          },
        },
      });

      // 4. Notify remaining members
      const remainingParticipants =
        await prisma.conversationParticipant.findMany({
          where: { conversationId: convId },
        });

      remainingParticipants.forEach((p: { userId: number }) => {
        io.to(`user:${p.userId}`).emit("conversation_updated", {
          conversationId: convId,
          action: "member_left",
          leftUserId: userId,
        });
      });

      // 5. Notify the leaving member (to remove from their UI)
      io.to(`user:${userId}`).emit("conversation_removed", {
        conversationId: convId,
        reason: "left_group",
      });

      return res.json({ success: true, message: "Left group successfully" });
    } catch (err) {
      console.error("Leave group error:", err);
      return res.status(500).json({ message: "Error leaving group" });
    }
  };
