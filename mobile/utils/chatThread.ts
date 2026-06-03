import { getAvatarUrl } from "@/utils/avatar";

const ATTACHMENT_TYPES = new Set(["file", "image", "video", "audio"]);

const isAttachmentType = (type: string | undefined) => {
  return !!type && ATTACHMENT_TYPES.has(type);
};

export const dedupeById = (list: any[]) => {
  const seen = new Set<string>();
  const uniq: any[] = [];

  for (const item of list) {
    const key = item.id != null ? item.id.toString() : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      uniq.push(item);
    }
  }

  return uniq;
};

export const parseFileInfo = (item: any) => {
  if (item.fileInfo && item.fileInfo.size) {
    return item.fileInfo;
  }

  try {
    const info =
      typeof item.content === "string"
        ? JSON.parse(item.content)
        : item.content;
    return info;
  } catch {
    if (
      item.type === "image" ||
      item.type === "video" ||
      item.type === "audio"
    ) {
      return { url: item.content };
    }
  }

  return undefined;
};

export const mapThreadMessage = (
  message: any,
  currentUserId?: number,
  options: { status?: string; includeSeenBy?: boolean } = {},
) => {
  const mapped: any = {
    ...message,
    fromMe: message.senderId ? String(message.senderId) === String(currentUserId) : false,
    time: new Date(message.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    edited:
      message.updatedAt && message.createdAt
        ? new Date(message.updatedAt).getTime() >
          new Date(message.createdAt).getTime()
        : false,
    text: message.text || message.content,
    contactName: message.sender?.id
      ? message.sender.fullName
      : message.type === "system"
        ? "Hệ thống"
        : undefined,
    contactAvatar: message.sender?.avatar
      ? getAvatarUrl(message.sender.avatar) || undefined
      : undefined,
    sharedContact:
      message.type === "contact"
        ? typeof message.content === "string" &&
          (message.content.startsWith("{") || message.content.startsWith("["))
          ? JSON.parse(message.content)
          : { fullName: message.content }
        : undefined,
  };

  if (options.includeSeenBy !== false) {
    mapped.seenBy = message.seenBy || [];
  }

  if (options.status) {
    mapped.status = options.status;
  }

  if (isAttachmentType(message.type)) {
    mapped.fileInfo = parseFileInfo(message);
  }

  return mapped;
};

export const mapThreadMedia = (media: any[], currentUserId?: number) => {
  return media.map((item: any) => {
    let fileInfo = item.fileInfo;

    if (!fileInfo && isAttachmentType(item.type)) {
      try {
        fileInfo =
          typeof item.content === "string"
            ? JSON.parse(item.content)
            : item.content;
      } catch {
        if (
          item.type === "image" ||
          item.type === "video" ||
          item.type === "audio"
        ) {
          fileInfo = { url: item.content };
        }
      }
    }

    return {
      ...item,
      fromMe: item.senderId ? String(item.senderId) === String(currentUserId) : false,
      contactName: item.sender?.id ? item.sender.fullName : undefined,
      contactAvatar: item.sender?.avatar
        ? getAvatarUrl(item.sender.avatar) || undefined
        : undefined,
      fileInfo,
    };
  });
};

const formatDateKey = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const getSeparatorText = (dateStr: string) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  if (isSameDay(d, today)) {
    return `${time} Hôm nay`;
  }

  if (isSameDay(d, yesterday)) {
    return `${time} Hôm qua`;
  }

  return `${time} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export const buildProcessedMessages = (messages: any[], currentUserId?: number) => {
  if (!messages || messages.length === 0) return [];

  const withDates: any[] = [];
  const grouped: any[] = [];
  const msgById: Record<string, any> = {};

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const key = msg.id != null ? msg.id.toString() : `i-${i}`;
    msgById[key] = msg;

    if (msg.type === "image" && msg.status !== "sending") {
      const groupImages = [msg];
      let j = i + 1;

      while (
        j < messages.length &&
        messages[j].type === "image" &&
        messages[j].senderId === msg.senderId &&
        messages[j].status !== "sending" &&
        messages[j].createdAt &&
        msg.createdAt &&
        Math.abs(
          new Date(messages[j].createdAt).getTime() -
            new Date(msg.createdAt).getTime(),
        ) < 60000
      ) {
        groupImages.push(messages[j]);
        j++;
      }

      if (groupImages.length > 1) {
        grouped.push({
          ...msg,
          id:
            msg.id != null && msg.id.toString() !== ""
              ? msg.id
              : `auto-${Math.round(new Date(msg.createdAt).getTime())}-${i}`,
          type: "image_group" as any,
          images: [...groupImages].reverse(),
        });
        i = j - 1;
        continue;
      }
    }

    grouped.push(msg);
  }

  for (let i = 0; i < grouped.length; i++) {
    const msg = grouped[i];
    const stableId =
      msg.id != null && msg.id.toString() !== ""
        ? msg.id
        : `auto-${Math.round(new Date(msg.createdAt).getTime())}-${i}`;

    // Resolve replyToId → replyTo object
    let replyTo = msg.replyTo;
    if (!replyTo && msg.replyToId != null) {
      const repliedMsg = msgById[msg.replyToId.toString()];
      if (repliedMsg) {
        replyTo = {
          ...repliedMsg,
          fromMe: repliedMsg.senderId
            ? String(repliedMsg.senderId) === String(currentUserId)
            : false,
        };
        if (!replyTo.contactName && !replyTo.sender?.fullName && replyTo.senderId) {
          for (const key of Object.keys(msgById)) {
            const other = msgById[key];
            if (other !== repliedMsg && String(other.senderId) === String(replyTo.senderId)) {
              if (other.contactName) {
                replyTo.contactName = other.contactName;
                break;
              }
            }
          }
        }
      }
    }

    withDates.push({
      ...msg,
      id: stableId,
      replyTo,
    });

    const nextMsg = grouped[i + 1];
    const prevMsg = grouped[i - 1];
    withDates[withDates.length - 1]._hasFooter = !prevMsg || prevMsg.senderId !== msg.senderId;
    const currentDate = formatDateKey(msg.createdAt);
    const nextDate = nextMsg ? formatDateKey(nextMsg.createdAt) : null;

    if (!nextMsg || currentDate !== nextDate) {
      withDates.push({
        id: `date-${msg.id || i}`,
        type: "date_separator",
        date: getSeparatorText(msg.createdAt),
        createdAt: msg.createdAt,
      });
    }
  }

  return withDates;
};

export const getChatItemType = (item: any): string => {
  if (!item) return 'text';
  if (item.type === 'date_separator') return 'date_separator';
  if (item.type === 'system' || item.type === 'separator') return 'separator';
  if (item.type === 'image_group') return 'image_group';
  if (item.type === 'sticker') return 'sticker';
  if (item.type === 'image') return 'image';
  if (item.type === 'video') return 'video';
  if (item.type === 'audio') return 'audio';
  if (item.type === 'file') return 'file';
  if (item.type === 'location') return 'location';
  if (item.type === 'call') return 'call';
  if (item.type) return 'text';
  return 'text';
};

export const estimateTextMessageHeight = (item: any, windowWidth: number): number => {
  const rawText = (item?.text || item?.content || '').toString();
  if (!rawText) return 96;

  const maxBubbleWidth = windowWidth * 0.75;
  const horizontalChrome = 40;
  const textAreaWidth = Math.max(140, maxBubbleWidth - horizontalChrome);
  const avgCharWidth = 7.2;
  const charsPerLine = Math.max(16, Math.floor(textAreaWidth / avgCharWidth));

  const wrappedLines = rawText
    .split('\n')
    .reduce((total: number, paragraph: string) => {
      const trimmed = paragraph.trimEnd();
      if (!trimmed) return total + 1;
      return total + Math.max(1, Math.ceil(trimmed.length / charsPerLine));
    }, 0);

  const lineCount = Math.max(1, wrappedLines);
  const replyExtra = item?.replyTo ? 56 : 0;
  const editedExtra = item?.edited ? 18 : 0;
  const footerExtra = item?.status === 'sending' || item?.status === 'error' || item?.time ? 22 : 14;
  const bubblePadding = 24;
  const textLineHeight = 20;

  return Math.round(replyExtra + editedExtra + footerExtra + bubblePadding + lineCount * textLineHeight);
};

export const computeChatItemSize = (
  item: any,
  windowWidth: number,
  windowHeight: number,
): number => {
  if (!item) return 96;

  const footerH = item._hasFooter ? 20 : 0;
  let size = 96;
  const type = getChatItemType(item);

  if ((type === 'image' || type === 'video') && item.fileInfo?.width && item.fileInfo?.height) {
    const maxWidth = windowWidth * 0.75;
    const maxHeight = windowHeight * 0.48;
    const aspect = item.fileInfo.width / item.fileInfo.height || 1;
    let imgH = maxWidth / aspect;
    if (imgH > maxHeight) imgH = maxHeight;
    size = Math.round(8 + imgH + footerH + 8);
  } else if (type === 'image_group' && Array.isArray(item.images) && item.images.length > 0) {
    const count = item.images.length;
    const maxWidth = windowWidth * 0.75;
    const per = count === 2 ? 2 : Math.min(3, count);
    const gap = 6;
    const cellW = Math.floor((maxWidth - gap * (per - 1)) / per);
    const maxCellHeightCap = Math.round(windowHeight * 0.48);
    let maxCellH = 0;
    for (let i = 0; i < count; i++) {
      const img = item.images[i];
      const w = img?.fileInfo?.width;
      const h = img?.fileInfo?.height;
      const aspect = (w && h) ? (w / h) : 1;
      let cellH = Math.round(cellW / aspect);
      if (cellH > maxCellHeightCap) cellH = maxCellHeightCap;
      if (cellH > maxCellH) maxCellH = cellH;
    }
    const rows = Math.ceil(count / per);
    const totalH = rows * maxCellH + (rows - 1) * gap;
    size = Math.round(8 + totalH + footerH + 8);
  } else if (type === 'text') {
    size = estimateTextMessageHeight(item, windowWidth);
  } else {
    switch (type) {
      case 'date_separator':
      case 'separator': size = 40; break;
      case 'sticker':
      case 'audio': size = 104; break;
      case 'location': size = 196; break;
      case 'file': size = 128; break;
      case 'call': size = 128; break;
      case 'image': size = 260; break;
      case 'video': size = 300; break;
      case 'image_group': size = 320; break;
    }
  }
  return size;
};

export const getThreadStatusText = (
  isGroup: boolean,
  targetUserStatus: { status: string; lastSeen: number | null } | null,
) => {
  if (isGroup) return null;
  if (!targetUserStatus) return null;
  if (targetUserStatus.status === "online") return "Đang hoạt động";
  if (targetUserStatus.lastSeen) {
    const diff = Math.floor((Date.now() - targetUserStatus.lastSeen) / 60000);
    if (diff < 1) return "Hoạt động vừa xong";
    if (diff < 60) return `Hoạt động ${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Hoạt động ${hours} giờ trước`;
    return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
  }
  return null;
};
