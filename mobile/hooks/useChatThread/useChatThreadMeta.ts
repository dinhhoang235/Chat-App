import { useMemo } from "react";
import { getAvatarUrl } from "@/utils/avatar";
import { getInitials } from "@/utils/initials";
import { getThreadStatusText } from "@/utils/chatThread";

interface UseChatThreadMetaParams {
  typingUser: any;
  groupDetails: any;
  paramAvatar: any;
  paramsAvatars: any;
  paramsMembersCount: any;
  isGroup: boolean;
  targetUserStatus: { status: string; lastSeen: number | null } | null;
}

export function useChatThreadMeta({
  typingUser,
  groupDetails,
  paramAvatar,
  paramsAvatars,
  paramsMembersCount,
  isGroup,
  targetUserStatus,
}: UseChatThreadMetaParams) {
  const avatarParam = Array.isArray(paramAvatar) ? paramAvatar[0] : paramAvatar;
  const displayTypingAvatar = typingUser?.avatar
    ? getAvatarUrl(typingUser.avatar)
    : avatarParam
      ? getAvatarUrl(avatarParam)
      : undefined;

  const typingUserInitials = typingUser?.fullName
    ? getInitials(typingUser.fullName)
    : "?";

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

    // Parse JSON avatars from params
    if (paramsAvatars) {
      try {
        const parsed =
          typeof paramsAvatars === "string"
            ? JSON.parse(paramsAvatars)
            : paramsAvatars;

        if (Array.isArray(parsed)) {
          return parsed.map((url: string) => ({ url }));
        }
      } catch {
        // Fall back to handling as CSV
        return Array.isArray(paramsAvatars)
          ? paramsAvatars
          : typeof paramsAvatars === "string" && paramsAvatars.includes(",")
            ? paramsAvatars.split(",")
            : [paramsAvatars as string];
      }
    }

    return [];
  }, [groupDetails, paramsAvatars]);

  const membersCount =
    groupDetails?.participants?.length ||
    (paramsMembersCount ? Number(paramsMembersCount) : undefined);

  const statusText = getThreadStatusText(isGroup, targetUserStatus);

  return {
    displayTypingAvatar,
    typingUserInitials,
    groupAvatars,
    membersCount,
    statusText,
  };
}
