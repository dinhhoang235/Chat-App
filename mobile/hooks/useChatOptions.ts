import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/authContext";
import { useChatDetails } from "@/hooks/useChatOptions/useChatDetails";
import { useRecentMedia } from "@/hooks/useChatOptions/useRecentMedia";
import { useChatOptionsActions } from "@/hooks/useChatOptions/useChatOptionsActions";

export function useChatOptions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [muteVisible, setMuteVisible] = useState(false);
  const [muteSettingsVisible, setMuteSettingsVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const [blockVisible, setBlockVisible] = useState(false);
  const [blockMessages, setBlockMessages] = useState<boolean>(false);
  const [blockCalls, setBlockCalls] = useState<boolean>(false);

  const [displayNameModalVisible, setDisplayNameModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);

  const [reportVisible, setReportVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [leaveVisible, setLeaveVisible] = useState(false);

  const {
    id,
    isGroup,
    isOnline,
    groupDetails,
    pinned,
    setPinned,
    selectedMuteOption,
    setSelectedMuteOption,
    excludeReminders,
    setExcludeReminders,
    groupAvatars,
    name,
    avatar,
    membersCount,
    isOwner,
    fetchConversationDetails,
  } = useChatDetails(params, user);

  const { recentMedia } = useRecentMedia(id);

  const { handleMute, handleTogglePin, performClearChat, performLeaveGroup } =
    useChatOptionsActions({
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
    });

  const isMuted = selectedMuteOption !== "Không tắt";

  return {
    router,
    params,
    id,
    name,
    avatar,
    isGroup,
    membersCount,
    groupAvatars,
    isOnline,
    groupDetails,
    pinned,
    handleTogglePin,
    muteVisible,
    setMuteVisible,
    muteSettingsVisible,
    setMuteSettingsVisible,
    selectedMuteOption,
    setSelectedMuteOption,
    excludeReminders,
    setExcludeReminders,
    addModalVisible,
    setAddModalVisible,
    blockVisible,
    setBlockVisible,
    blockMessages,
    setBlockMessages,
    blockCalls,
    setBlockCalls,
    displayNameModalVisible,
    setDisplayNameModalVisible,
    displayName,
    setDisplayName,
    reportVisible,
    setReportVisible,
    confirmVisible,
    setConfirmVisible,
    leaveVisible,
    setLeaveVisible,
    isMuted,
    performClearChat,
    performLeaveGroup,
    isOwner,
    fetchConversationDetails,
    recentMedia,
    handleMute,
  };
}
