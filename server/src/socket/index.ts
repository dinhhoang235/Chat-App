import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { TokenPayload } from "../utils/jwt.js";
import { cacheMessage, setUserStatus } from "../utils/redis.js";
import prisma from "../db.js";
import { AuthenticatedSocket } from "./types.js";
import { registerCallHandlers } from "./callHandlers.js";
import { registerSignalingHandlers } from "./signalingHandlers.js";
import { registerTypingHandlers } from "./typingHandlers.js";

const JWT_SECRET = process.env.JWT_SECRET!;

export const setupSocket = (io: Server) => {
  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.userId}`);
    let presenceHeartbeat: NodeJS.Timeout | null = null;

    if (socket.user) {
      const userId = Number(socket.user.userId);
      socket.join(`user:${userId}`);
      setUserStatus(userId, "online");
      io.emit("user_status_changed", { userId, status: "online" });

      presenceHeartbeat = setInterval(() => {
        setUserStatus(userId, "online").catch((err) => {
          console.error("Failed to refresh user status heartbeat:", err);
        });
      }, 30000);

      // OPTIMIZATION #6: Cache user profile once on connection instead of querying DB on every typing event
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { avatar: true, fullName: true },
        });
        if (user) {
          socket.cachedUserData = {
            avatar: user.avatar || null,
            fullName: user.fullName || null,
          };
        }
      } catch (err) {
        console.error("Error caching user data on connection:", err);
      }
    }

    socket.on("join_conversation", (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
      console.log(
        `User ${socket.user?.userId} joined conversation ${conversationId}`,
      );
    });

    socket.on("leave_conversation", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(
        `User ${socket.user?.userId} left conversation ${conversationId}`,
      );
    });

    registerTypingHandlers(socket);
    registerCallHandlers(io, socket);
    registerSignalingHandlers(io, socket);

    socket.on("send_message", async (payload: any, callback?: (response: any) => void) => {
      const userId = socket.user?.userId ? Number(socket.user.userId) : null;
      const conversationId = Number(payload?.conversationId);
      const content = payload?.content;
      const rawType = typeof payload?.type === "string" ? payload.type : "text";
      const type = rawType === "LOCATION" ? "location" : rawType.toLowerCase();

      if (!userId) {
        callback?.({ error: "Unauthorized" });
        return;
      }

      if (!conversationId || typeof content !== "string") {
        callback?.({ error: "Invalid message payload" });
        return;
      }

      try {
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
          select: { id: true },
        });

        if (!participant) {
          callback?.({ error: "Conversation not found" });
          return;
        }

        const message = await prisma.message.create({
          data: {
            content,
            type,
            conversationId,
            senderId: userId,
            replyToId: payload?.replyToId ? Number(payload.replyToId) : undefined,
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

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        await prisma.conversationParticipant.updateMany({
          where: {
            conversationId,
            hiddenAt: { not: null },
          },
          data: {
            hiddenAt: null,
          },
        });

        const messagePayload = {
          ...message,
          tempId: payload?.tempId,
        };

        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId },
          select: { userId: true },
        });

        participants.forEach((p) => {
          io.to(`user:${p.userId}`).emit("receive_message", messagePayload);
          io.to(`user:${p.userId}`).emit("conversation_updated", {
            conversationId: message.conversationId,
            messageId: message.id,
            lastMessagePreview: {
              id: message.id,
              type: message.type,
              senderId: message.senderId,
            },
          });
        });

        io.to(`conversation:${conversationId}`).emit("new_message", messagePayload);

        cacheMessage(conversationId, message).catch((err) => console.error(err));

        callback?.({ ok: true, message: messagePayload });
      } catch (err) {
        console.error("Socket send_message error:", err);
        callback?.({ error: "Error sending message" });
      }
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user?.userId}`);
      if (presenceHeartbeat) {
        clearInterval(presenceHeartbeat);
        presenceHeartbeat = null;
      }
      if (socket.user) {
        const userId = Number(socket.user.userId);
        const lastSeen = Date.now();
        try {
          await setUserStatus(userId, "offline");
        } catch (err) {
          console.error("Failed to set user status on disconnect:", err);
        }
        io.emit("user_status_changed", {
          userId,
          status: "offline",
          lastSeen,
        });
      }
    });
  });
};
