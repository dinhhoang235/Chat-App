import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { chatApi } from "@/services/chat";
import { socketService } from "@/services/socket";
import { useAuth } from "@/context/authContext";
import { getAvatarUrl } from "@/utils/avatar";
import { getInitials } from "@/utils/initials";

export function useChatOptions() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [pinned, setPinned] = useState(false);
  const [muteVisible, setMuteVisible] = useState(false);
  const [muteSettingsVisible, setMuteSettingsVisible] = useState(false);
  const [selectedMuteOption, setSelectedMuteOption] =
    useState<string>("Không tắt");
  const [excludeReminders, setExcludeReminders] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // block settings
  const [blockVisible, setBlockVisible] = useState(false);
  const [blockMessages, setBlockMessages] = useState<boolean>(false);
  const [blockCalls, setBlockCalls] = useState<boolean>(false);

  // edit display name
  const [displayNameModalVisible, setDisplayNameModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);

  // report modal state
  const [reportVisible, setReportVisible] = useState(false);
  // confirm clear chat modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  // leave group modal
  const [leaveVisible, setLeaveVisible] = useState(false);

  // resolve id / contact so we can detect groups reliably
  const id = (params as any).id as string;
  const targetUserId = (params as any).targetUserId as string | undefined;

  const isGroup = useMemo(() => {
    return (
      (params as any).isGroup === "true" || (params as any).isGroup === true
    );
  }, [params]);

  const [currentStatus, setCurrentStatus] = useState<string | undefined>(
    (params as any).status,
  );
  const isOnline = currentStatus === "online";

  const [groupDetails, setGroupDetails] = useState<any>(null);

  const groupAvatars = useMemo(() => {
    if (groupDetails?.participants) {
      return [...groupDetails.participants]
        .sort((a: any, b: any) => a.id - b.id)
        .map((p: any) => ({
          url: p.user.avatar ? getAvatarUrl(p.user.avatar) : null,
          name: p.user.fullName,
          initials: getInitials(p.user.fullName),
        }));
    }
    const raw = (params as any).avatars;
    if (raw) {
      const list =
        typeof raw === "string"
          ? raw.split(",")
          : Array.isArray(raw)
            ? raw
            : [raw];
      return list.map((url: string) => ({ url }));
    }
    return [];
  }, [groupDetails, params]);

  const name = useMemo(() => {
    if (isGroup && groupDetails?.name) return groupDetails.name;
    if (!isGroup && groupDetails?.participants) {
      const other = groupDetails.participants.find(
        (p: any) => p.userId !== user?.id,
      );
      if (other?.user?.fullName) return other.user.fullName;
    }
    return (params as any).name || "Người dùng";
  }, [isGroup, groupDetails, params, user]);

  const avatar = useMemo(() => {
    if (!isGroup && groupDetails?.participants) {
      const other = groupDetails.participants.find(
        (p: any) => p.userId !== user?.id,
      );
      if (other?.user?.avatar)
        return getAvatarUrl(other.user.avatar) || undefined;
    }
    const rawAvatar = (params as any).avatar as string | undefined;
    return rawAvatar ? getAvatarUrl(rawAvatar) || undefined : undefined;
  }, [isGroup, groupDetails, params, user]);

  const membersCount = useMemo(() => {
    if (groupDetails?.membersCount != null) return groupDetails.membersCount;
    return (params as any).membersCount
      ? parseInt((params as any).membersCount as string)
      : 0;
  }, [groupDetails, params]);

  const fetchConversationDetails = useCallback(async () => {
    try {
      const response = await chatApi.getConversationDetails(id);
      setGroupDetails(response.data);

      if (user) {
        const me = response.data.participants?.find(
          (p: any) => p.userId === user.id,
        );
        setPinned(!!me?.isPinned);
        if (me?.mutedUntil) {
          const until = new Date(me.mutedUntil);
          if (until > new Date()) {
            // Estimate which option it was, or just set to 'Cho đến khi được mở lại' if far
            if (until.getFullYear() > 2090) {
              setSelectedMuteOption("Cho đến khi được mở lại");
            } else {
              setSelectedMuteOption("Đã tắt"); // Generic label if we can't match exactly
            }
          } else {
            setSelectedMuteOption("Không tắt");
          }
        } else {
          setSelectedMuteOption("Không tắt");
        }
      }
    } catch (error) {
      console.error("Fetch conversation details error:", error);
    }
  }, [id, user]);

  // preview media for media row
  const [recentMedia, setRecentMedia] = useState<
    { uri: string; type: "image" | "video" }[]
  >([]);
  const loadRecentMedia = useCallback(async () => {
    try {
      const media: { uri: string; type: "image" | "video" }[] = [];
      let cursor: any = undefined;
      // page through until we gather 4 media items or run out of messages
      while (media.length < 4) {
        const res = await chatApi.getMessages(Number(id), cursor, 20);
        if (!res.data || res.data.length === 0) break;
        for (const m of res.data) {
          if (m.type === "image" || m.type === "video") {
            let url: string | undefined;
            try {
              const info =
                typeof m.content === "string"
                  ? JSON.parse(m.content)
                  : m.content;
              url = info?.url;
            } catch {
              url = m.content;
            }
            if (url) {
              if (!url.startsWith("http")) {
                url = getAvatarUrl(url) || url;
              }
              media.push({ uri: url, type: m.type as "image" | "video" });
            }
          }
          if (media.length >= 4) break;
        }
        if (media.length >= 4) break;
        // prepare for next page
        const last = res.data[res.data.length - 1];
        cursor = last ? last.id : undefined;
        if (!cursor) break;
      }
      setRecentMedia(media.slice(0, 4));
    } catch (err) {
      console.error("Load recent media error", err);
    }
  }, [id]);

  useEffect(() => {
    loadRecentMedia();
  }, [loadRecentMedia]);

  // refresh on new media message
  useEffect(() => {
    const handler = (data: any) => {
      if (
        data.conversationId?.toString() === id.toString() &&
        (data.type === "image" || data.type === "video")
      ) {
        loadRecentMedia();
      }
    };
    socketService.on("new_message", handler);
    return () => {
      socketService.off("new_message", handler);
    };
  }, [id, loadRecentMedia]);

  useEffect(() => {
    fetchConversationDetails();
  }, [fetchConversationDetails]);

  // Listen for member updates
  useEffect(() => {
    if (!isGroup) return;

    const handleUpdate = (data: any) => {
      if (data.conversationId?.toString() === id.toString()) {
        fetchConversationDetails();
      }
    };

    socketService.on("conversation_updated", handleUpdate);
    return () => {
      socketService.off("conversation_updated", handleUpdate);
    };
  }, [id, isGroup, fetchConversationDetails]);

  useEffect(() => {
    if (!targetUserId) return;

    const handleStatusChanged = (data: { userId: number; status: string }) => {
      if (data.userId.toString() === targetUserId) {
        setCurrentStatus(data.status);
      }
    };

    socketService.on("user_status_changed", handleStatusChanged);
    return () => {
      socketService.off("user_status_changed", handleStatusChanged);
    };
  }, [targetUserId]);

  const isMuted = selectedMuteOption !== "Không tắt";

  const performClearChat = async () => {
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
  };

  const performLeaveGroup = async () => {
    setLeaveVisible(false);
    try {
      await chatApi.leaveGroup(id);
      Alert.alert("Đã rời nhóm", "Bạn đã rời khỏi nhóm thành công.");
      // Quay lại màn hình tin nhắn cũ (tabs/index) hoặc màn hình chính
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Leave group error:", error);
      Alert.alert("Lỗi", "Không thể rời nhóm. Vui lòng thử lại sau.");
    }
  };

  const isOwner = useMemo(() => {
    if (!isGroup || !groupDetails || !user) return false;
    const currentUserParticipant = groupDetails.participants?.find(
      (p: any) => p.userId === user.id,
    );
    return currentUserParticipant?.role === "owner";
  }, [isGroup, groupDetails, user]);

  const handleMute = async (option: string, exclude: boolean = false) => {
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
  };

  const handleTogglePin = async () => {
    const newVal = !pinned;
    try {
      await chatApi.pinConversation(id, newVal);
      setPinned(newVal);
    } catch (err) {
      console.error("Pin error:", err);
      Alert.alert("Lỗi", "Không thể ghim cuộc trò chuyện");
    }
  };

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
