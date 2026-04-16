import { Response } from "express";
import { Server } from "socket.io";
import prisma from "../../db.js";
import { AuthRequest } from "../../middleware/auth.js";
import { cacheMessage } from "../../utils/redis.js";
import { sendPushNotifications } from "../../utils/notification.js";
import { uploadFile } from "../../utils/minio.js";
import { DIRECT_UPLOAD_MAX_SIZE_BYTES } from "../../constants/upload.js";

type ParticipantWithPushToken = {
  userId: number;
  user: {
    pushToken?: string;
  };
  mutedUntil: Date | null;
};

export const sendMessage =
  (io: Server) =>
  async (req: AuthRequest, res: Response): Promise<any> => {
    const { conversationId } = req.params;
    let { content, type = "text", replyToId, tempId } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const convId = parseInt(
        Array.isArray(conversationId) ? conversationId[0] : conversationId,
      );

      // if a file was uploaded, override content and type accordingly
      if (req.file) {
        // enforce <5MB for attachments
        if (req.file.size > DIRECT_UPLOAD_MAX_SIZE_BYTES) {
          return res.status(400).json({ message: "File must be under 100MB" });
        }

        const { url: fileUrl, fileName } = await uploadFile(req.file);

        const isImage = req.file.mimetype.startsWith("image/");
        const isAudio = req.file.mimetype.startsWith("audio/");

        const info = {
          url: fileUrl,
          name: isImage ? fileName : req.file.originalname, // Ảnh dùng UUID, File dùng tên gốc
          size: req.file.size,
          mime: req.file.mimetype,
        };
        content = JSON.stringify(info);
        if (isImage) {
          type = "image";
        } else if (isAudio) {
          type = "audio";
        } else {
          type = "file";
        }
      }

      // 1. Create message in DB
      const message = await prisma.message.create({
        data: {
          content,
          type,
          conversationId: convId,
          senderId: userId,
          replyToId: replyToId ? parseInt(replyToId) : undefined,
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
          conversation: {
            select: {
              id: true,
              isGroup: true,
              name: true,
            },
          },
        },
      });

      // 2. Update Conversation updatedAt and un-hide for everyone who previously hid/deleted it
      await prisma.conversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });

      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId: convId,
          hiddenAt: { not: null },
        },
        data: {
          hiddenAt: null,
        },
      });

      // 3. Broadcast via socket
      io.to(`conversation:${convId}`).emit("new_message", {
        ...message,
        tempId,
      });

      // 3. Cache the new message
      cacheMessage(convId, message).catch((e) => console.error(e));

      // Also notify users who might not be in the conversation room currently
      // but should see an updated list of conversations
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: convId },
        include: { user: true },
      });

      participants.forEach((p: { userId: number }) => {
        io.to(`user:${p.userId}`).emit("conversation_updated", {
          conversationId: message.conversationId,
          lastMessage: message,
        });
      });

      const pushTokens = participants
        .filter(
          (p: ParticipantWithPushToken) =>
            p.userId !== userId && p.user.pushToken,
        )
        .filter(
          (p: ParticipantWithPushToken) =>
            !(p.mutedUntil && new Date(p.mutedUntil) > new Date()),
        )
        .map((p: ParticipantWithPushToken) => p.user.pushToken as string);

      if (pushTokens.length > 0) {
        let bodyText = "";
        if (message.type === "text") {
          bodyText = message.content;
        } else if (message.type === "image") {
          bodyText = "📷 Ảnh";
        } else if (message.type === "file") {
          try {
            const info =
              typeof message.content === "string"
                ? JSON.parse(message.content)
                : message.content;
            bodyText = `📎 ${info?.name || "Tệp"}`;
          } catch {
            bodyText = "📎 Tệp";
          }
        } else if (message.type === "audio") {
          bodyText = "🎤 Ghi âm";
        }

        let titleText = message.sender?.fullName || "Tin nhắn mới";
        if (message.conversation?.isGroup) {
          titleText = `Nhóm ${message.conversation.name || ""}`.trim();
          const senderName = message.sender?.fullName || "Ai đó";
          bodyText = `${senderName}: ${bodyText}`;
        }

        await sendPushNotifications(pushTokens, {
          title: titleText,
          body: bodyText,
          channelId: "chat",
          sound: "notification.mp3",
          data: {
            conversationId: convId,
            isGroup: message.conversation?.isGroup || false,
            name: message.conversation?.name || "",
          },
        }).catch((err) => console.error("Push error:", err));
      }

      return res.status(201).json(message);
    } catch (err) {
      console.error("Send message error:", err);
      return res.status(500).json({ message: "Error sending message" });
    }
  };
