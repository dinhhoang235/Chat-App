import { getAvatarUrl } from "@/utils/avatar";
import { getInitials } from "@/utils/initials";

const parseJson = (value: any) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const formatDuration = (seconds?: number) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const secs = (total % 60).toString().padStart(2, "0");
  return ` ${mins}:${secs}`;
};

export const formatConversationLastMessage = (
  lastMsg: any,
  user: any,
  conv: any,
) => {
  if (!lastMsg) {
    return "Chưa có tin nhắn";
  }

  const isFromMe = user && lastMsg.senderId === user.id;

  if (lastMsg.type === "image") {
    return isFromMe ? "Bạn: [Hình ảnh]" : "[Hình ảnh]";
  }

  if (lastMsg.type === "video") {
    let durationStr = "";
    try {
      const content = parseJson(lastMsg.content);
      if (content?.duration) {
        const d = content.duration;
        const mins = Math.floor(d / 60);
        const secs = Math.floor(d % 60);
        durationStr = ` ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      }
    } catch {
      // Ignore parse errors
    }
    return isFromMe ? `Bạn: [Video]${durationStr}` : `[Video]${durationStr}`;
  }

  if (lastMsg.type === "audio") {
    let durationStr = "";
    try {
      const content = parseJson(lastMsg.content);
      durationStr = formatDuration(content?.duration);
    } catch {
      // Ignore parse errors
    }
    return isFromMe
      ? `Bạn: [Tin nhắn thoại]${durationStr}`
      : `[Tin nhắn thoại]${durationStr}`;
  }

  if (lastMsg.type === "call") {
    try {
      const info = parseJson(lastMsg.content);
      const isVideo = info.callType === "video";
      const typeLabel = isVideo ? "video" : "thoại";
      const endedStatuses = ["missed", "rejected", "no_answer", "completed"];
      const isGroupCall =
        conv.isGroup ||
        (Array.isArray(info.groupTargets) && info.groupTargets.length > 1);

      if (isGroupCall) {
        if (info.status === "started") {
          return "Cuộc gọi nhóm đang diễn ra";
        }

        if (endedStatuses.includes(info.status)) {
          return "Cuộc gọi nhóm đã kết thúc";
        }

        const prefix = isFromMe ? "Bạn: " : "";
        return `${prefix}[Cuộc gọi ${typeLabel}]`;
      }

      if (
        !isFromMe &&
        (info.status === "missed" || info.status === "no_answer")
      ) {
        return "[Cuộc gọi lỡ]";
      }

      const direction = isFromMe ? "đi" : "đến";
      const prefix = isFromMe ? "Bạn: " : "";
      return `${prefix}[Cuộc gọi ${typeLabel} ${direction}]`;
    } catch {
      return isFromMe ? "Bạn: [Cuộc gọi]" : "[Cuộc gọi]";
    }
  }

  if (lastMsg.type === "file") {
    let content: any = null;
    try {
      content = parseJson(lastMsg.content);
    } catch {
      content = null;
    }

    if (content?.mime?.startsWith("audio/")) {
      const durationStr = formatDuration(content?.duration);
      return isFromMe
        ? `Bạn: [Tin nhắn thoại]${durationStr}`
        : `[Tin nhắn thoại]${durationStr}`;
    }

    return isFromMe ? "Bạn: [File]" : "[File]";
  }

  let mediaIcon = "";
  try {
    const content = parseJson(lastMsg.content);
    if (content.mime?.startsWith("video/")) {
      mediaIcon = "[Video]";
      if (content.duration) {
        const d = content.duration;
        const mins = Math.floor(d / 60);
        const secs = Math.floor(d % 60);
        mediaIcon += ` ${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      }
    } else if (content.mime?.startsWith("audio/")) {
      mediaIcon = `[Tin nhắn thoại]${formatDuration(content.duration)}`;
    } else if (content.mime?.startsWith("image/")) {
      mediaIcon = "[Hình ảnh]";
    }
  } catch {
    // Ignore parse errors
  }

  const contentText = mediaIcon || lastMsg.content;
  return isFromMe ? `Bạn: ${contentText}` : contentText;
};

export const mapConversationResponse = (conv: any, user: any, colors: any) => {
  const lastMsg = conv.messages[0];
  const otherParticipant = conv.participants.find(
    (p: any) => p.userId !== user?.id,
  );
  const ownParticipant = conv.participants.find(
    (p: any) => p.userId === user?.id,
  );
  const lastMessageText = formatConversationLastMessage(lastMsg, user, conv);

  const avatars = [...conv.participants]
    .sort((a: any, b: any) => a.id - b.id)
    .map((p: any) => ({
      url: p.user.avatar ? getAvatarUrl(p.user.avatar) : null,
      name: p.user.fullName,
      initials: getInitials(p.user.fullName),
    }));

  const updatedAt = lastMsg
    ? new Date(lastMsg.createdAt).getTime()
    : new Date(conv.updatedAt || conv.createdAt).getTime();

  const mutedUntil = ownParticipant?.mutedUntil
    ? new Date(ownParticipant.mutedUntil)
    : null;

  return {
    id: conv.id.toString(),
    name: conv.name || otherParticipant?.user.fullName || "Người dùng",
    lastMessage: lastMessageText,
    time: lastMsg
      ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    unread: conv._count?.messages || 0,
    initials: getInitials(conv.name || otherParticipant?.user.fullName),
    color: conv.isGroup
      ? colors.tint
      : otherParticipant?.user.avatar
        ? undefined
        : colors.tint,
    avatar: conv.avatar
      ? getAvatarUrl(conv.avatar)
      : otherParticipant?.user.avatar
        ? getAvatarUrl(otherParticipant.user.avatar)
        : undefined,
    avatars,
    membersCount: conv.membersCount || conv.participants.length,
    isGroup: conv.isGroup,
    targetUserId: otherParticipant?.userId.toString(),
    status: otherParticipant?.user.status || "offline",
    isMuted: !!(mutedUntil && mutedUntil > new Date()),
    isPinned: !!ownParticipant?.isPinned,
    updatedAt,
  };
};
