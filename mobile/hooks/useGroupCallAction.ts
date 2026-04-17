import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useCall } from "@/context/callContext";

type CallActionHandler = (message: any, callData: any) => void;

export function useGroupCallAction(
  openGroupCallModal: () => void,
): CallActionHandler {
  const { incomingCall, activeCall, acceptCall, joinCall } = useCall();
  const router = useRouter();

  return useCallback(
    (message: any, callData: any) => {
      const isGroupCall = Boolean(
        callData.isGroupCall ||
        (Array.isArray(callData.groupTargets) &&
          callData.groupTargets.length > 2) ||
        (Array.isArray(callData.targetUserIds) &&
          callData.targetUserIds.length > 1),
      );

      if (!isGroupCall) {
        return;
      }

      const isStarted = callData.status === "started";
      const isEnded = ["completed", "rejected", "missed", "no_answer"].includes(
        callData.status,
      );

      if (isEnded) {
        Alert.alert(
          "Cuộc gọi nhóm đã kết thúc",
          "Bạn có muốn gọi lại cho nhóm?",
          [
            { text: "Hủy", style: "cancel" },
            { text: "Gọi lại", onPress: openGroupCallModal },
          ],
        );
        return;
      }

      if (isStarted) {
        if (incomingCall?.callId === callData.callId) {
          acceptCall();
          return;
        }

        if (activeCall?.callId === callData.callId) {
          router.replace("/videoCall" as any);
          return;
        }

        const joinInfo: any = {
          callId: callData.callId,
          conversationId: message.conversationId || undefined,
          callType: callData.callType,
          isOutgoing: false,
          remoteUserId: callData.callerId,
          remoteName: callData.callerName || "Người gọi",
          remoteAvatar: callData.callerAvatar,
          groupTargets: callData.groupTargets,
          targetUserIds: callData.targetUserIds,
        };

        joinCall(joinInfo);
        return;
      }

      openGroupCallModal();
    },
    [
      acceptCall,
      activeCall,
      incomingCall,
      joinCall,
      openGroupCallModal,
      router,
    ],
  );
}
