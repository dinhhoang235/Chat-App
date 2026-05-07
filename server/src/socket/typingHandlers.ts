import { AuthenticatedSocket } from "./types.js";

export const registerTypingHandlers = (socket: AuthenticatedSocket) => {
  socket.on("typing_start", async (conversationId: number) => {
    // OPTIMIZATION #6: Use cached user data instead of DB query on every keystroke
    // User data was cached when socket connected, so no DB query needed here
    let avatar = socket.cachedUserData?.avatar || "";
    let fullName = socket.cachedUserData?.fullName || "";

    // Fallback to empty if cache is somehow not available
    // (should rarely happen since we cache on connection)
    if (!avatar || !fullName) {
      console.warn(
        `User data cache missing for typing event from user ${socket.user?.userId}`,
      );
    }

    socket.to(`conversation:${conversationId}`).emit("user_typing_start", {
      userId: socket.user?.userId,
      conversationId,
      avatar,
      fullName,
    });
  });

  socket.on("typing_stop", (conversationId: number) => {
    socket.to(`conversation:${conversationId}`).emit("user_typing_stop", {
      userId: socket.user?.userId,
      conversationId,
    });
  });
};
