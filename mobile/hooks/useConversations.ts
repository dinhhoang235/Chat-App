import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '@/context/themeContext';
import { useAuth } from '@/context/authContext';
import { useSelection } from '@/context/selectionContext';
import { chatApi } from '@/services/chat';
import { socketService } from '@/services/socket';
import { API_URL } from '@/services/api';

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

  const fetchConversations = useCallback(async () => {
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
        } else if (lastMsg.type === 'file') {
          // show name if available
          let fileName = '';
          try {
            const info = typeof lastMsg.content === 'string' ? JSON.parse(lastMsg.content) : lastMsg.content;
            fileName = info?.name ? ` ${info.name}` : '';
          } catch {}
          lastMessageText = isFromMe ? `Bạn: [File]${fileName}` : `[File]${fileName}`;
        } else {
          // fallback to raw text content
          lastMessageText = isFromMe ? `Bạn: ${lastMsg.content}` : lastMsg.content;
        }

        const avatars = conv.participants
          .map((p: any) => p.user.avatar ? `${API_URL}${p.user.avatar}` : null)
          .filter(Boolean);
        
        const updatedAt = lastMsg 
          ? new Date(lastMsg.createdAt).getTime() 
          : new Date(conv.updatedAt || conv.createdAt).getTime();
        
        return {
          id: conv.id.toString(),
          name: conv.name || otherParticipant?.user.fullName || 'Người dùng',
          lastMessage: lastMessageText,
          time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          unread: conv._count?.messages || 0,
          initials: (conv.name || otherParticipant?.user.fullName || 'Z')[0],
          color: conv.isGroup ? colors.tint : (otherParticipant?.user.avatar ? undefined : colors.tint),
          avatar: conv.avatar ? `${API_URL}${conv.avatar}` : (otherParticipant?.user.avatar ? `${API_URL}${otherParticipant.user.avatar}` : undefined),
          avatars: avatars,
          membersCount: conv.membersCount || conv.participants.length,
          isGroup: conv.isGroup,
          targetUserId: otherParticipant?.userId.toString(),
          status: otherParticipant?.user.status || 'offline',
          updatedAt: updatedAt
        };
      }).sort((a: any, b: any) => b.updatedAt - a.updatedAt);
      setData(mapped);
    } catch (err) {
      console.error("Fetch conversations error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, colors.tint]);

  useEffect(() => {
    if (isFocused) {
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
  }, [fetchConversations, isFocused]);

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

  const handleMarkRead = () => {
    setData((prev) => prev.map(m => selectedIds.includes(m.id) ? { ...m, unread: 0 } : m));
  };

  const handleDeleteSelected = () => {
    setData((prev) => prev.filter(m => !selectedIds.includes(m.id)));
    setSelectionMode(false);
    setSelectedIds([]);
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
    handleDeleteSelected,
    router,
    colors
  };
}
