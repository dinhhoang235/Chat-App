import { Server } from "socket.io";
import { AuthenticatedSocket } from "./types.js";

export const registerSignalingHandlers = (
  io: Server,
  socket: AuthenticatedSocket,
) => {
  socket.on("webrtc_offer", ({ callId, targetUserId, offer }: any) => {
    console.log(
      `[Signaling] Offer: ${socket.user?.userId} → ${targetUserId} (callId: ${callId})`,
    );
    io.to(`user:${targetUserId}`).emit("webrtc_offer", {
      callId,
      from: socket.user?.userId,
      offer,
    });
  });

  socket.on("webrtc_answer", ({ callId, targetUserId, answer }: any) => {
    console.log(
      `[Signaling] Answer: ${socket.user?.userId} → ${targetUserId} (callId: ${callId})`,
    );
    io.to(`user:${targetUserId}`).emit("webrtc_answer", {
      callId,
      from: socket.user?.userId,
      answer,
    });
  });

  socket.on(
    "webrtc_ice_candidate",
    ({ callId, targetUserId, candidate }: any) => {
      io.to(`user:${targetUserId}`).emit("webrtc_ice_candidate", {
        callId,
        from: socket.user?.userId,
        candidate,
      });
    },
  );

  socket.on("camera_toggle", ({ callId, targetUserId, enabled }: any) => {
    console.log(
      `[Signaling] Camera toggle: ${socket.user?.userId} → ${targetUserId} (${enabled})`,
    );
    io.to(`user:${targetUserId}`).emit("camera_toggle", {
      callId,
      userId: socket.user?.userId,
      enabled,
    });
  });
};
