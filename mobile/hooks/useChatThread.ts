import { useState, useRef, useEffect, useCallback } from 'react';
import { FlatList } from 'react-native';
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useTheme } from '../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSearch } from '../context/searchContext';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi } from '../services/chat';
import { socketService } from '../services/socket';
import { userAPI } from '../services/user';
import { useAuth } from '../context/authContext';
import { API_URL } from '../services/api';
import { useTyping } from './useTyping';

export function useChatThread() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (params.id as string) === 'new' ? null : (params.id as string);
  const targetUserId = params.targetUserId as string;
  const paramName = params.name as string | undefined;
  // isNewConversation khi navigate từ /chat/new hoặc khi chưa có conversation id
  const isNewConversation = (!id || id === 'new') && !!targetUserId;

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNewConversation);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(id || null);
  const [targetUserIdState, setTargetUserIdState] = useState<string | null>(
    targetUserId || (params.targetUserId as string) || null
  );
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const { isTyping, typingUser, handleType } = useTyping(conversationId, user?.id);
  
  const [targetUserStatus, setTargetUserStatus] = useState<{status: string, lastSeen: number | null} | null>(null);
  const [targetUser, setTargetUser] = useState<any>(null);

  // Derive which avatar to show: if typingUser has an avatar, use it; otherwise fallback to params.avatar
  const avatarParam = Array.isArray(params.avatar) ? params.avatar[0] : params.avatar;
  const isGroup = params.isGroup === 'true';
  const groupAvatars = params.avatars 
    ? (Array.isArray(params.avatars) ? params.avatars : (typeof params.avatars === 'string' && params.avatars.includes(',') ? params.avatars.split(',') : [params.avatars as string])) 
    : [];
  const membersCount = params.membersCount ? Number(params.membersCount) : undefined;

  const displayTypingAvatar = typingUser?.avatar
    ? (typingUser.avatar.startsWith('http') ? typingUser.avatar : `${API_URL}${typingUser.avatar}`)
    : (avatarParam
        ? (avatarParam.startsWith('http') ? avatarParam : `${API_URL}${avatarParam}`)
        : undefined);

  const messagesRef = useRef<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // If we are in 'new' mode, we should still check if a conversation actually exists
  // but we won't show the loading spinner to the user.
  useEffect(() => {
    const checkExisting = async () => {
      if (isNewConversation && targetUserIdState && !conversationId) {
        try {
          const response = await chatApi.startConversation(Number(targetUserIdState));
          const conv = response.data;
          const convId = conv.id || conv.conversationId;
          if (convId && conv.messages && conv.messages.length > 0) {
            // If it exists AND has messages, switch to regular mode
            setConversationId(convId.toString());
          }
        } catch {
          console.log("No existing conversation found yet, sticking with 'new' mode");
        }
      }
    };
    checkExisting();
  }, [isNewConversation, targetUserIdState, conversationId]);

  // Reset state when conversation changes
  useEffect(() => {
    setInitialFetchDone(false);
    setHasMore(true);
    setMessages([]);
    if (conversationId) setLoading(true);
  }, [conversationId]);

  // Search mode toggled by Options or header
  const initialSearch = !!(params as any).search;
  const [searchMode, setSearchMode] = useState<boolean>(initialSearch);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultIndices] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const [composerVisible, setComposerVisible] = useState(false);
  const [messageText, setMessageText] = useState('');

  const onTextChange = (text: string) => {
    setMessageText(text);
    handleType();
  };

  const insets = useSafeAreaInsets();

  // Listen to SearchContext open events to avoid navigation flicker
  const { openFor, close } = useSearch();
  const isFocused = useIsFocused();
  const [pendingOpen, setPendingOpen] = useState(false);

  const keyboardHeight = useSharedValue(0);

  const animatedContentStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboardHeight.value - insets.bottom / 2),
  }));

  useKeyboardHandler({
    onStart: (event) => {
      'worklet';
      keyboardHeight.value = event.height;
    },
    onMove: (event) => {
      'worklet';
      keyboardHeight.value = event.height;
    },
    onEnd: (event) => {
      'worklet';
      keyboardHeight.value = event.height;
    },
  });

  const getTargetUserStatus = useCallback(async () => {
    if (!targetUserIdState) return;
    try {
      const data = await userAPI.getUserById(Number(targetUserIdState));
      if (data) {
        setTargetUserStatus({ status: data.status, lastSeen: data.lastSeen });
        setTargetUser(data);
      }
    } catch (err) {
      console.error('Fetch target user status error:', err);
    }
  }, [targetUserIdState]);

  useEffect(() => {
    if (isFocused && targetUserIdState) {
      getTargetUserStatus();
    }
  }, [isFocused, targetUserIdState, getTargetUserStatus]);

  useEffect(() => {
    if (!isFocused) return;

    const handleStatusChanged = (data: { userId: number; status: string; lastSeen?: number }) => {
      if (targetUserIdState && data.userId === Number(targetUserIdState)) {
        setTargetUserStatus({ status: data.status, lastSeen: data.lastSeen || null });
      }
    };

    socketService.on('user_status_changed', handleStatusChanged);
    return () => {
      socketService.off('user_status_changed', handleStatusChanged);
    };
  }, [isFocused, targetUserIdState]);

  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (!conversationId) return;
    if (isLoadMore && (!hasMore || loadingMore)) return;

    try {
      if (isLoadMore) setLoadingMore(true);

      const cursor =
        isLoadMore && messagesRef.current.length > 0
          ? messagesRef.current[messagesRef.current.length - 1].id
          : undefined;

      const response = await chatApi.getMessages(Number(conversationId), cursor, 20);
      const newMessages = response.data;

      const mapped = newMessages.map((m: any) => ({
        ...m,
        fromMe: m.senderId === user?.id,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contactName: m.sender?.fullName,
        contactAvatar: m.sender?.avatar ? `${API_URL}${m.sender.avatar}` : undefined,
        seenBy: m.seenBy || [],
      }));

      if (isLoadMore) {
        setMessages(prev => [...prev, ...mapped]);
      } else {
        setMessages(mapped);
        setInitialFetchDone(true);
      }

      setHasMore(newMessages.length === 20);

      // If we still don't have targetUserId, extract it from the messages
      if (!targetUserIdState && mapped.length > 0) {
        const otherMessage = mapped.find((m: any) => m.senderId !== user?.id);
        if (otherMessage) {
          setTargetUserIdState(otherMessage.senderId.toString());
        }
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, user?.id, hasMore, loadingMore, targetUserIdState]);

  useEffect(() => {
    if (!isFocused || !conversationId) return;

    const conversationIdNum = parseInt(conversationId, 10);
    
    // Join room and initial fetch
    if (!initialFetchDone) {
      fetchMessages(false);
      socketService.emit('join_conversation', conversationIdNum);
    }

    // Always mark as read when focusing a conversation
    chatApi.markAsRead(conversationIdNum).catch(err => {
      console.error('Mark as read focus error:', err);
    });
  }, [conversationId, isFocused, fetchMessages, initialFetchDone]);

  useEffect(() => {
    if (!isFocused) return;

    const conversationIdNum = conversationId ? parseInt(conversationId, 10) : null;

    // Listen for seen events
    const handleMessageSeen = (data: any) => {
      const { userId: seenByUserId, seenAt, user: seenUser } = data;
      if (seenByUserId === user?.id) return;

      const userData = seenUser || { id: seenByUserId, fullName: 'User', avatar: undefined };

      setMessages(prev =>
        prev.map(m => {
          if (new Date(m.createdAt) <= new Date(seenAt)) {
            const alreadySeen = m.seenBy?.some((u: any) => u.id === seenByUserId);
            if (!alreadySeen && m.senderId !== seenByUserId) {
              return { ...m, seenBy: [...(m.seenBy || []), userData] };
            }
          }
          return m;
        })
      );
    };

    socketService.on('message_seen', handleMessageSeen);

    const userId = user?.id;

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      // If we are currently in this conversation and it's from someone else, mark it as read immediately
      if (isFocused && conversationId && message.conversationId === parseInt(conversationId, 10)) {
        if (message.senderId !== user?.id) {
          chatApi.markAsRead(message.conversationId).catch(err => {
            console.error('Mark as read new message error:', err);
          });
        }
      }

      setMessages(prev => {
        const isDuplicate = prev.find(m => m.id === message.id);
        if (isDuplicate) return prev;

        const tempIdx = prev.findIndex(
          m => m.status === 'sending' && m.content === message.content && m.senderId === message.senderId
        );

        const mappedMessage = {
          ...message,
          fromMe: message.senderId === userId,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contactName: message.sender?.fullName,
          contactAvatar: message.sender?.avatar ? `${API_URL}${message.sender.avatar}` : undefined,
          seenBy: message.seenBy || [],
          status: 'sent',
        };

        if (tempIdx !== -1) {
          const newMessages = [...prev];
          newMessages[tempIdx] = mappedMessage;
          return newMessages;
        }

        return [mappedMessage, ...prev];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    };

    socketService.on('new_message', handleNewMessage);

    return () => {
      if (conversationIdNum) socketService.emit('leave_conversation', conversationIdNum);
      socketService.off('new_message');
      socketService.off('message_seen');
    };
  }, [conversationId, user?.id, isFocused]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');

    // Scroll to bottom (index 0 in inverted list)
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: text,
      fromMe: true,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
    };

    try {
      let targetConversationId = conversationId;

      // If this is a new conversation, create it with the first message
      if (isNewConversation && !conversationId) {
        setMessages([tempMessage]);
        setCreatingConversation(true);
        try {
          const response = await chatApi.startConversation(Number(targetUserIdState), text);
          const conv = response.data;
          targetConversationId = conv.id || conv.conversationId;

          if (targetConversationId) {
            setConversationId(targetConversationId.toString());
            const lastMessage = conv.messages?.[0];
            if (lastMessage) {
              setMessages([{
                ...lastMessage,
                fromMe: true,
                time: new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent',
              }]);
            }
          }
          return;
        } catch (err) {
          console.error('Error creating conversation on send:', err);
          setMessages([]);
          setMessageText(text);
          return;
        } finally {
          setCreatingConversation(false);
        }
      }

      setMessages(prev => [tempMessage, ...prev]);

      await chatApi.sendMessage(Number(targetConversationId), text);

      // We don't manually set 'sent' here because the socket 'new_message'
      // will arrive and replace this temp message or add the real one.
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageText(text);
    }
  };

  // if a request to open search for this chat is received
  useEffect(() => {
    if (openFor && openFor === (params as any).id) {
      if (isFocused) {
        setSearchMode(true);
        setPendingOpen(false);
      } else {
        // wait until screen is focused
        setPendingOpen(true);
      }
    }
  }, [openFor, params, isFocused]);

  // when screen becomes focused and we have pending open, enable search mode
  useEffect(() => {
    if (isFocused && pendingOpen) {
      setSearchMode(true);
      setPendingOpen(false);
    }
  }, [isFocused, pendingOpen]);

  // When searchMode is closed, tell context to close
  useEffect(() => {
    if (!searchMode && openFor === (params as any).id) {
      close();
    }
  }, [searchMode, openFor, params, close]);

  return {
    colors,
    params,
    router,
    id,
    paramName,
    targetUserId,
    targetUserIdState,
    isNewConversation,
    messages,
    loading,
    loadingMore,
    hasMore,
    conversationId,
    creatingConversation,
    isTyping,
    displayTypingAvatar,
    flatListRef,
    inputRef,
    searchMode,
    setSearchMode,
    searchQuery,
    setSearchQuery,
    resultIndices,
    currentResultIndex,
    setCurrentResultIndex,
    composerVisible,
    setComposerVisible,
    messageText,
    onTextChange,
    insets,
    animatedContentStyle,
    fetchMessages,
    handleSend,
    targetUser,
    targetUserStatus,
    isGroup,
    groupAvatars,
    membersCount
  };
}
