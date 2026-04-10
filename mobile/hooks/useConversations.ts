import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@/context/themeContext';
import { useAuth } from '@/context/authContext';
import { useSelection } from '@/context/selectionContext';
import { chatApi } from '@/services/chat';
import { socketService } from '@/services/socket';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';

export function useConversations() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectionMode, setSelectionMode } = useSelection();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startChatVisible, setStartChatVisible] = useState(false);

  const formatDuration = (seconds?: number) => {
    if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '';
    const total = Math.max(0, Math.round(seconds));
    const mins = Math.floor(total / 60).toString().padStart(2, '0');
    const secs = (total % 60).toString().padStart(2, '0');
    return ` ${mins}:${secs}`;
  };

  const fetchConversations = useCallback(async () => {
    // don't attempt to hit the API if we don't have a logged-in user yet
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await chatApi.getConversations();
      const mapped = response.data.map((conv: any) => {
        const lastMsg = conv.messages[0];
        const otherParticipant = conv.participants.find((p: any) => p.userId !== user?.id);
        
        const isFromMe = lastMsg && user && (lastMsg.senderId === user.id);
        
        let lastMessageText: string;
        if (!lastMsg) {
          lastMessageText = 'Chưa có tin nhắn';
        } else if (lastMsg.type === 'image') {
          lastMessageText = isFromMe ? 'Bạn: [Hình ảnh]' : '[Hình ảnh]';
        } else if (lastMsg.type === 'video') {
          let durationStr = '';
          try {
            const content = typeof lastMsg.content === 'string' ? JSON.parse(lastMsg.content) : lastMsg.content;
            if (content.duration) {
              const d = content.duration;
              const mins = Math.floor(d / 60);
              const secs = Math.floor(d % 60);
              durationStr = ` ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
          } catch {
            // Ignore parse errors
          }
          lastMessageText = isFromMe ? `Bạn: [Video]${durationStr}` : `[Video]${durationStr}`;
        } else if (lastMsg.type === 'audio') {
          let durationStr = '';
          try {
            const content = typeof lastMsg.content === 'string' ? JSON.parse(lastMsg.content) : lastMsg.content;
            durationStr = formatDuration(content?.duration);
          } catch {
            // Ignore parse errors
          }
          lastMessageText = isFromMe ? `Bạn: [Tin nhắn thoại]${durationStr}` : `[Tin nhắn thoại]${durationStr}`;
        } else if (lastMsg.type === 'call') {
          try {
            const info = typeof lastMsg.content === 'string' ? JSON.parse(lastMsg.content) : lastMsg.content;
            const isVideo = info.callType === 'video';
            const typeLabel = isVideo ? 'video' : 'thoại';
            
            if (!isFromMe && (info.status === 'missed' || info.status === 'no_answer')) {
              lastMessageText = '[Cuộc gọi lỡ]';
            } else {
              const direction = isFromMe ? 'đi' : 'đến';
              const prefix = isFromMe ? 'Bạn: ' : '';
              lastMessageText = `${prefix}[Cuộc gọi ${typeLabel} ${direction}]`;
            }
          } catch {
            lastMessageText = isFromMe ? 'Bạn: [Cuộc gọi]' : '[Cuộc gọi]';
          }
        } else if (lastMsg.type === 'file') {
          let content: any = null;
          try {
            content = typeof lastMsg.content === 'string' ? JSON.parse(lastMsg.content) : lastMsg.content;
          } catch {
            content = null;
          }

          if (content?.mime?.startsWith('audio/')) {
            const durationStr = formatDuration(content?.duration);
            lastMessageText = isFromMe ? `Bạn: [Tin nhắn thoại]${durationStr}` : `[Tin nhắn thoại]${durationStr}`;
          } else {
            lastMessageText = isFromMe ? 'Bạn: [File]' : '[File]';
          }
        } else {
          // Check if it's JSON content that should have been a media type
          let mediaIcon = '';
          try {
            const content = typeof lastMsg.content === 'string' ? JSON.parse(lastMsg.content) : lastMsg.content;
            if (content.mime?.startsWith('video/')) {
              mediaIcon = '[Video]';
              if (content.duration) {
                const d = content.duration;
                const mins = Math.floor(d / 60);
                const secs = Math.floor(d % 60);
                mediaIcon += ` ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              }
            } else if (content.mime?.startsWith('audio/')) {
              mediaIcon = `[Tin nhắn thoại]${formatDuration(content.duration)}`;
            } else if (content.mime?.startsWith('image/')) {
              mediaIcon = '[Hình ảnh]';
            }
          } catch {}

          const contentText = mediaIcon || lastMsg.content;
          lastMessageText = isFromMe ? `Bạn: ${contentText}` : contentText;
        }

        const avatars = [...conv.participants]
          .sort((a: any, b: any) => a.id - b.id)
          .map((p: any) => ({
            url: p.user.avatar ? getAvatarUrl(p.user.avatar) : null,
            name: p.user.fullName,
            initials: getInitials(p.user.fullName)
          }));
        
        const updatedAt = lastMsg 
          ? new Date(lastMsg.createdAt).getTime() 
          : new Date(conv.updatedAt || conv.createdAt).getTime();
        
        return {
          id: conv.id.toString(),
          name: conv.name || otherParticipant?.user.fullName || 'Người dùng',
          lastMessage: lastMessageText,
          time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          unread: conv._count?.messages || 0,
          initials: getInitials(conv.name || otherParticipant?.user.fullName),
          color: conv.isGroup ? colors.tint : (otherParticipant?.user.avatar ? undefined : colors.tint),
          avatar: conv.avatar ? getAvatarUrl(conv.avatar) : (otherParticipant?.user.avatar ? getAvatarUrl(otherParticipant.user.avatar) : undefined),
          avatars: avatars,
          membersCount: conv.membersCount || conv.participants.length,
          isGroup: conv.isGroup,
          targetUserId: otherParticipant?.userId.toString(),
          status: otherParticipant?.user.status || 'offline',
          isMuted: !!(conv.participants.find((p: any) => p.userId === user?.id)?.mutedUntil && new Date(conv.participants.find((p: any) => p.userId === user?.id).mutedUntil) > new Date()),
          isPinned: !!conv.participants.find((p: any) => p.userId === user?.id)?.isPinned,
          updatedAt: updatedAt
        };
      }).sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
      setData(mapped);
    } catch (err: any) {
      // 401 may occur if auth isn't ready; we already guard but log others
      if (err?.response?.status !== 401) {
        console.error("Fetch conversations error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [user, colors.tint]);

  useEffect(() => {
    if (isFocused && user) {
      fetchConversations();
    }

    const handleUpdate = (data: any) => {
      fetchConversations();
    };

    const handleNewMessage = (message: any) => {
      // Trigger a re-fetch to get the latest order and message text
      fetchConversations();
    };

    const handleStatusChanged = (data: { userId: number; status: string }) => {
      setData(prev => prev.map(conv => {
        if (conv.targetUserId === data.userId.toString()) {
          return { ...conv, status: data.status };
        }
        return conv;
      }));
    };

    socketService.on('conversation_updated', handleUpdate);
    socketService.on('new_message', handleNewMessage);
    socketService.on('user_status_changed', handleStatusChanged);

    return () => {
      socketService.off('conversation_updated', handleUpdate);
      socketService.off('new_message', handleNewMessage);
      socketService.off('user_status_changed', handleStatusChanged);
    };
  }, [fetchConversations, isFocused, user]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    setSelectedIds(data.map(d => d.id));
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const handleMarkRead = async () => {
    try {
      for (const id of selectedIds) {
        await chatApi.markAsRead(id);
      }
      setData((prev) => prev.map(m => selectedIds.includes(m.id) ? { ...m, unread: 0 } : m));
      setSelectionMode(false);
      setSelectedIds([]);
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkReadSingle = async (id: string) => {
    try {
      await chatApi.markAsRead(id);
      setData((prev) => prev.map(m => m.id === id ? { ...m, unread: 0 } : m));
    } catch (err) {
      console.error("Mark read single error:", err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await chatApi.deleteConversation(id);
      setData((prev) => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Delete conversation error:", err);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      // For now, delete each one sequentially since there's no bulk delete API
      for (const id of selectedIds) {
        await chatApi.deleteConversation(id);
      }
      setData((prev) => prev.filter(m => !selectedIds.includes(m.id)));
      setSelectionMode(false);
      setSelectedIds([]);
    } catch (err) {
      console.error("Delete selected error:", err);
    }
  };

  const handleMute = async (id: string, duration: string) => {
    let mutedUntil: Date | null = null;
    const now = new Date();

    if (duration === 'Trong 1 giờ') {
      mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (duration === 'Trong 4 giờ') {
      mutedUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    } else if (duration === 'Đến 8 giờ sáng') {
      mutedUntil = new Date();
      mutedUntil.setHours(8, 0, 0, 0);
      if (mutedUntil <= now) mutedUntil.setDate(mutedUntil.getDate() + 1);
    } else if (duration === 'Cho đến khi được mở lại') {
      mutedUntil = new Date('2099-12-31T23:59:59Z');
    }

    try {
      await chatApi.muteConversation(id, mutedUntil);
      setData(prev => prev.map(m => m.id === id ? { ...m, isMuted: true } : m));
    } catch (err) {
      console.error("Mute error:", err);
    }
  };

  const handleUnmute = async (id: string) => {
    try {
      await chatApi.muteConversation(id, null);
      setData(prev => prev.map(m => m.id === id ? { ...m, isMuted: false } : m));
    } catch (err) {
      console.error("Unmute error:", err);
    }
  };

  const handlePin = async (id: string, pinned: boolean) => {
    try {
      await chatApi.pinConversation(id, pinned);
      setData(prev => {
        const newData = prev.map(m => m.id === id ? { ...m, isPinned: pinned } : m);
        return [...newData].sort((a: any, b: any) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        });
      });
    } catch (err) {
      console.error("Pin error:", err);
    }
  };

  const handleMarkUnread = async (id: string) => {
    try {
      await chatApi.markAsUnread(id);
      setData(prev => prev.map(m => m.id === id ? { ...m, unread: Math.max(1, m.unread) } : m));
    } catch (err) {
      console.error("Mark unread error:", err);
    }
  };

  return {
    data,
    setData,
    loading,
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    startChatVisible,
    setStartChatVisible,
    toggleSelect,
    handleSelectAll,
    handleCancelSelection,
    handleMarkRead,
    handleMarkReadSingle,
    handleDeleteSelected,
    handleDeleteConversation,
    handleMute,
    handleUnmute,
    handlePin,
    handleMarkUnread,
    router,
    colors
  };
}
