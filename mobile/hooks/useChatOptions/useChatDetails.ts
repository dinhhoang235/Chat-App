import { useState, useEffect, useCallback, useMemo } from "react";
import { chatApi } from "@/services/chat";
import { socketService } from "@/services/socket";
import { getAvatarUrl } from "@/utils/avatar";
import { getInitials } from "@/utils/initials";

export function useChatDetails(params: any, user: any) {
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
  const [pinned, setPinned] = useState(false);
  const [selectedMuteOption, setSelectedMuteOption] =
    useState<string>("Không tắt");
  const [excludeReminders, setExcludeReminders] = useState<boolean>(false);

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
            if (until.getFullYear() > 2090) {
              setSelectedMuteOption("Cho đến khi được mở lại");
            } else {
              setSelectedMuteOption("Đã tắt");
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

  useEffect(() => {
    fetchConversationDetails();
  }, [fetchConversationDetails]);

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

  const isOwner = useMemo(() => {
    if (!isGroup || !groupDetails || !user) return false;
    const currentUserParticipant = groupDetails.participants?.find(
      (p: any) => p.userId === user.id,
    );
    return currentUserParticipant?.role === "owner";
  }, [isGroup, groupDetails, user]);

  return {
    id,
    targetUserId,
    isGroup,
    currentStatus,
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
  };
}
