import { getAvatarUrl } from '@/utils/avatar';

const ATTACHMENT_TYPES = new Set(['file', 'image', 'video', 'audio']);

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
    const info = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
    return info;
  } catch {
    if (item.type === 'image' || item.type === 'video' || item.type === 'audio') {
      return { url: item.content };
    }
  }

  return undefined;
};

export const mapThreadMessage = (
  message: any,
  currentUserId?: number,
  options: { status?: string; includeSeenBy?: boolean } = {}
) => {
  const mapped: any = {
    ...message,
    fromMe: message.senderId ? message.senderId === currentUserId : false,
    time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    contactName: message.sender?.id ? message.sender.fullName : (message.type === 'system' ? 'Hệ thống' : undefined),
    contactAvatar: message.sender?.avatar ? getAvatarUrl(message.sender.avatar) || undefined : undefined,
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
        fileInfo = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
      } catch {
        if (item.type === 'image' || item.type === 'video' || item.type === 'audio') {
          fileInfo = { url: item.content };
        }
      }
    }

    return {
      ...item,
      fromMe: item.senderId ? item.senderId === currentUserId : false,
      contactName: item.sender?.id ? item.sender.fullName : undefined,
      contactAvatar: item.sender?.avatar ? getAvatarUrl(item.sender.avatar) || undefined : undefined,
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

  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const time = `${hours}:${minutes}`;

  if (isSameDay(d, today)) {
    return `${time} Hôm nay`;
  }

  if (isSameDay(d, yesterday)) {
    return `${time} Hôm qua`;
  }

  return `${time} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

export const buildProcessedMessages = (messages: any[]) => {
  if (!messages || messages.length === 0) return [];

  const withDates: any[] = [];
  const grouped: any[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.type === 'image' && msg.status !== 'sending') {
      const groupImages = [msg];
      let j = i + 1;

      while (
        j < messages.length &&
        messages[j].type === 'image' &&
        messages[j].senderId === msg.senderId &&
        messages[j].status !== 'sending' &&
        messages[j].createdAt && msg.createdAt &&
        Math.abs(new Date(messages[j].createdAt).getTime() - new Date(msg.createdAt).getTime()) < 60000
      ) {
        groupImages.push(messages[j]);
        j++;
      }

      if (groupImages.length > 1) {
        grouped.push({
          ...msg,
          type: 'image_group' as any,
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
    withDates.push(msg);

    const nextMsg = grouped[i + 1];
    const currentDate = formatDateKey(msg.createdAt);
    const nextDate = nextMsg ? formatDateKey(nextMsg.createdAt) : null;

    if (!nextMsg || currentDate !== nextDate) {
      withDates.push({
        id: `date-${msg.id || i}`,
        type: 'date_separator',
        date: getSeparatorText(msg.createdAt),
        createdAt: msg.createdAt,
      });
    }
  }

  return withDates;
};

export const getThreadStatusText = (
  isGroup: boolean,
  targetUserStatus: { status: string; lastSeen: number | null } | null
) => {
  if (isGroup) return null;
  if (!targetUserStatus) return null;
  if (targetUserStatus.status === 'online') return 'Đang hoạt động';
  if (targetUserStatus.lastSeen) {
    const diff = Math.floor((Date.now() - targetUserStatus.lastSeen) / 60000);
    if (diff < 1) return 'Hoạt động vừa xong';
    if (diff < 60) return `Hoạt động ${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Hoạt động ${hours} giờ trước`;
    return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
  }
  return null;
};
