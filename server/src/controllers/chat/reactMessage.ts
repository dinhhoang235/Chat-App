import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { sendPushNotifications } from "../../utils/notification.js";

export const reactMessage =
  (io: Server) =>
  async (req: AuthRequest, res: Response): Promise<any> => {
    const { conversationId, messageId } = req.params;
    const { reaction } = req.body; // e.g. "❤️", "👍", etc., or null/empty string to remove
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const convId = parseInt(
        Array.isArray(conversationId) ? conversationId[0] : (conversationId as string),
      );
      const msgId = parseInt(
        Array.isArray(messageId) ? messageId[0] : (messageId as string),
      );

      // Verify conversation participation
      const participant = await prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: convId,
            userId,
          },
        },
      });

      if (!participant) {
        return res
          .status(403)
          .json({ message: "Not a member of this conversation" });
      }

      // Verify message exists in this conversation
      const message = await prisma.message.findFirst({
        where: {
          id: msgId,
          conversationId: convId,
        },
      });

      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      // Check if we already have a reaction from this user for this message
      const existingReaction = await prisma.messageReaction.findUnique({
        where: {
          messageId_userId: {
            messageId: msgId,
            userId,
          },
        },
      });

      if (!reaction || reaction.trim() === "") {
        // Remove reaction if empty or explicitly requested to remove
        if (existingReaction) {
          await prisma.messageReaction.delete({
            where: {
              id: existingReaction.id,
            },
          });
        }
      } else {
        if (existingReaction) {
          if (existingReaction.reaction === reaction) {
            // Toggle off if they sent the exact same reaction
            await prisma.messageReaction.delete({
              where: {
                id: existingReaction.id,
              },
            });
          } else {
            // Update to new reaction
            await prisma.messageReaction.update({
              where: {
                id: existingReaction.id,
              },
              data: {
                reaction,
              },
            });
          }
        } else {
          // Create new reaction
          await prisma.messageReaction.create({
            data: {
              messageId: msgId,
              userId,
              reaction,
            },
          });
        }
      }

      // Fetch all current reactions for this message to emit/return
      const allReactions = await prisma.messageReaction.findMany({
        where: {
          messageId: msgId,
        },
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

      // Update Conversation updatedAt so it floats to top
      await prisma.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });

      // Get participants for sidebar update and push notifications
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId },
        select: {
          userId: true,
          mutedUntil: true,
          user: { select: { pushToken: true } },
        },
      });

      // Emit lightweight conversation_updated event for sidebar/list updates
      participants.forEach((p) => {
        io.to(`user:${p.userId}`).emit("conversation_updated", {
          conversationId: convId,
          messageId: msgId,
          lastMessagePreview: {
            id: msgId,
            type: message.type,
            senderId: message.senderId,
          },
        });
      });

      // Get reacting user's name
      const reactingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });
      const reactorName = reactingUser?.fullName || "Ai đó";

      // Send push notification to the message owner if they are not the reactor
      if (message.senderId !== userId && reaction && reaction.trim() !== "") {
        const messageSenderParticipant = participants.find((p) => p.userId === message.senderId);
        if (messageSenderParticipant && messageSenderParticipant.user.pushToken) {
          const isMuted = messageSenderParticipant.mutedUntil && new Date(messageSenderParticipant.mutedUntil) > new Date();
          if (!isMuted) {
            sendPushNotifications([messageSenderParticipant.user.pushToken], {
              title: reactorName,
              body: `${reactorName} đã bày tỏ cảm xúc ${reaction} với tin nhắn của bạn.`,
              channelId: "chat",
              sound: "notification.mp3",
              data: {
                conversationId: convId,
              },
            }).catch((e) => console.error("Push reaction notification error:", e));
          }
        }
      }

      // Emit socket event to notify other clients in the conversation room
      io.to(`conversation:${convId}`).emit("message_reaction", {
        conversationId: convId,
        messageId: msgId,
        reactions: allReactions,
      });

      return res.json({
        message: "Reaction updated successfully",
        reactions: allReactions,
      });
    } catch (err) {
      console.error("React message error:", err);
      return res.status(500).json({ message: "Error updating reaction" });
    }
  };
