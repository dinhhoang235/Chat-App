import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";
import { chatApi } from "@/services/chat";

interface UseChatOptionsActionsParams {
  id: string;
  pinned: boolean;
  setPinned: Dispatch<SetStateAction<boolean>>;
  setSelectedMuteOption: Dispatch<SetStateAction<string>>;
  setExcludeReminders: Dispatch<SetStateAction<boolean>>;
  setMuteVisible: Dispatch<SetStateAction<boolean>>;
  setMuteSettingsVisible: Dispatch<SetStateAction<boolean>>;
  setConfirmVisible: Dispatch<SetStateAction<boolean>>;
  setLeaveVisible: Dispatch<SetStateAction<boolean>>;
  router: any;
}

export function useChatOptionsActions({
  id,
  pinned,
  setPinned,
  setSelectedMuteOption,
  setExcludeReminders,
  setMuteVisible,
  setMuteSettingsVisible,
  setConfirmVisible,
  setLeaveVisible,
  router,
}: UseChatOptionsActionsParams) {
  const handleMute = useCallback(
    async (option: string, exclude: boolean = false) => {
      let mutedUntil: Date | null = null;
      const now = new Date();

      if (option === "Trong 1 giờ") {
        mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
      } else if (option === "Trong 4 giờ") {
        mutedUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      } else if (option === "Đến 8 giờ sáng") {
        const next8AM = new Date();
        next8AM.setHours(8, 0, 0, 0);
        if (next8AM <= now) next8AM.setDate(next8AM.getDate() + 1);
        mutedUntil = next8AM;
      } else if (option === "Cho đến khi được mở lại") {
        mutedUntil = new Date("2099-12-31T23:59:59Z");
      } else if (option === "Bật thông báo" || option === "Không tắt") {
        mutedUntil = null;
      }

      try {
        await chatApi.muteConversation(id, mutedUntil);
        setSelectedMuteOption(mutedUntil ? option : "Không tắt");
        setExcludeReminders(exclude);
        setMuteVisible(false);
        setMuteSettingsVisible(false);
      } catch (err) {
        console.error("Mute error:", err);
        Alert.alert("Lỗi", "Không thể tắt thông báo");
      }
    },
    [
      id,
      setExcludeReminders,
      setMuteSettingsVisible,
      setMuteVisible,
      setSelectedMuteOption,
    ],
  );

  const handleTogglePin = useCallback(async () => {
    const newVal = !pinned;

    try {
      await chatApi.pinConversation(id, newVal);
      setPinned(newVal);
    } catch (err) {
      console.error("Pin error:", err);
      Alert.alert("Lỗi", "Không thể ghim cuộc trò chuyện");
    }
  }, [id, pinned, setPinned]);

  const performClearChat = useCallback(async () => {
    setConfirmVisible(false);
    try {
      await chatApi.deleteConversation(id);
      Alert.alert("Đã xóa", "Lịch sử trò chuyện đã được xóa");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Delete conversation error:", error);
      Alert.alert(
        "Lỗi",
        "Không thể xóa cuộc trò chuyện. Vui lòng thử lại sau.",
      );
    }
  }, [id, router, setConfirmVisible]);

  const performLeaveGroup = useCallback(async () => {
    setLeaveVisible(false);
    try {
      await chatApi.leaveGroup(id);
      Alert.alert("Đã rời nhóm", "Bạn đã rời khỏi nhóm thành công.");
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Leave group error:", error);
      Alert.alert("Lỗi", "Không thể rời nhóm. Vui lòng thử lại sau.");
    }
  }, [id, router, setLeaveVisible]);

  return {
    handleMute,
    handleTogglePin,
    performClearChat,
    performLeaveGroup,
  };
}
