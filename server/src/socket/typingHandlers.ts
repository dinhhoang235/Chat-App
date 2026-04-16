import prisma from "../db.js";
import { AuthenticatedSocket } from "./types.js";

export const registerTypingHandlers = (socket: AuthenticatedSocket) => {
  socket.on("typing_start", async (conversationId: number) => {
    let avatar = "";

    if (socket.user?.userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: socket.user.userId },
          select: { avatar: true },
        });
        avatar = user?.avatar || "";
      } catch (err) {
        console.error("Error fetching user avatar for typing event:", err);
      }
    }

    socket.to(`conversation:${conversationId}`).emit("user_typing_start", {
      userId: socket.user?.userId,
      conversationId,
      avatar,
    });
  });

  socket.on("typing_stop", (conversationId: number) => {
    socket.to(`conversation:${conversationId}`).emit("user_typing_stop", {
      userId: socket.user?.userId,
      conversationId,
    });
  });
};
