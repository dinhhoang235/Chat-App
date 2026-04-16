import { Server } from "socket.io";
import { getCallInfo, setCallInfo } from "../utils/redis.js";

const CALL_TIMEOUT = 120000; // 2 minutes

export const checkCallTimeouts = async (callId: string, io: Server) => {
  const callInfo = await getCallInfo(callId);
  if (!callInfo) return;

  const now = Date.now();
  let changed = false;
  const invitedUserIds = new Set<number>(callInfo.invitedUserIds || []);
  const activeUserIds = new Set<number>(callInfo.activeUserIds || []);
  const rejectedUserIds = new Set<number>(callInfo.rejectedUserIds || []);
  const invitationTimes = callInfo.invitationTimes || {};

  for (const userId of invitedUserIds) {
    if (!activeUserIds.has(userId) && !rejectedUserIds.has(userId)) {
      const inviteTime =
        invitationTimes[userId] ||
        callInfo.startTime ||
        callInfo.invitationTime;
      if (now - inviteTime > CALL_TIMEOUT) {
        rejectedUserIds.add(userId);
        changed = true;

        io.to(`group_call:${callId}`).emit("call_rejected", {
          callId,
          userId,
          reason: "timeout",
        });
        console.log(`[Call] Timeout for user ${userId} in call ${callId}`);
      }
    }
  }

  if (changed) {
    callInfo.rejectedUserIds = Array.from(rejectedUserIds);
    await setCallInfo(callId, callInfo);
  }
};

export { CALL_TIMEOUT };
