import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { TokenPayload } from "../utils/jwt.js";
import { setUserStatus } from "../utils/redis.js";
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
