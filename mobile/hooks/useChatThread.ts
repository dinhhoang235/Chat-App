import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { setActiveConversationId, activeConversationId } from '@/services/notificationState';
import * as FileSystem from 'expo-file-system';
import { FlatList } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useKeyboardSheetHeight } from './useKeyboardSheetHeight';
import { useTheme } from '@/context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSearch } from '@/context/searchContext';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { chatApi } from '@/services/chat';
import { socketService } from '@/services/socket';
import { userAPI } from '@/services/user';
import { useAuth } from '@/context/authContext';
import { getAvatarUrl } from '@/utils/avatar';
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

  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [allMedia, setAllMedia] = useState<any[]>([]);
  const [loadingMoreMedia, setLoadingMoreMedia] = useState(false);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);

  const fetchAllMedia = useCallback(async (isLoadMore = false) => {
    if (!id || id === 'new') return;
    if (isLoadMore && (!hasMoreMedia || loadingMoreMedia)) return;

    try {
      if (isLoadMore) setLoadingMoreMedia(true);

      const cursor =
        isLoadMore && allMedia.length > 0
          ? allMedia[allMedia.length - 1].id
          : undefined;

      const response = await chatApi.getConversationMedia(id, cursor, 30);
      const newMedia = response.data;

      const mapped = newMedia.map((m: any) => {
        let fileInfo = m.fileInfo;
        // In case fileInfo isn't pre-mapped correctly from the server
        if (!fileInfo && (m.type === 'file' || m.type === 'image')) {
          try {
            fileInfo = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
          } catch {
            if (m.type === 'image') {
               fileInfo = { url: m.content };
            }
          }
        }
        return {
          ...m,
          fromMe: m.senderId ? m.senderId === user?.id : false,
          contactName: m.sender?.id ? m.sender.fullName : undefined,
          contactAvatar: m.sender?.avatar ? getAvatarUrl(m.sender.avatar) || undefined : undefined,
          fileInfo
        };
      });

      if (isLoadMore) {
        setAllMedia(prev => dedupe([...prev, ...mapped]));
      } else {
        setAllMedia(dedupe(mapped));
      }

      setHasMoreMedia(newMedia.length >= 30);
    } catch (error) {
      console.error('Fetch all media error:', error);
    } finally {
      if (isLoadMore) setLoadingMoreMedia(false);
    }
  }, [id, user?.id, hasMoreMedia, loadingMoreMedia, allMedia]);

  const fetchGroupDetails = useCallback(async () => {
    if (!id || params.isGroup !== 'true') return;
    try {
      const response = await chatApi.getConversationDetails(id);
      setGroupDetails(response.data);
    } catch (error) {
      console.error('Fetch group details error:', error);
    }
  }, [id, params.isGroup]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  // Listen for member updates
  useEffect(() => {
    if (params.isGroup !== 'true') return;

    const handleUpdate = (data: any) => {
      if (data.conversationId?.toString() === id?.toString()) {
        fetchGroupDetails();
      }
    };

    socketService.on('conversation_updated', handleUpdate);
    return () => {
      socketService.off('conversation_updated', handleUpdate);
    };
  }, [id, params.isGroup, fetchGroupDetails]);

  // Derive which avatar to show: if typingUser has an avatar, use it; otherwise fallback to params.avatar
  const avatarParam = Array.isArray(params.avatar) ? params.avatar[0] : params.avatar;
  const isGroup = params.isGroup === 'true';
  const groupAvatars = useMemo(() => {
    if (groupDetails?.participants) {
      return groupDetails.participants
        .map((p: any) => getAvatarUrl(p.user.avatar))
        .filter(Boolean) as string[];
    }
    return params.avatars 
      ? (Array.isArray(params.avatars) ? params.avatars : (typeof params.avatars === 'string' && params.avatars.includes(',') ? params.avatars.split(',') : [params.avatars as string])) 
      : [];
  }, [groupDetails, params.avatars]);

  const membersCount = groupDetails?.participants?.length || (params.membersCount ? Number(params.membersCount) : undefined);

  const displayTypingAvatar = typingUser?.avatar
    ? getAvatarUrl(typingUser.avatar)
    : (avatarParam ? getAvatarUrl(avatarParam) : undefined);

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

  // keep global notification state in sync so we don't show a local notification
  // for the conversation the user is actively viewing
  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => {
      // clear only if it's still our conversation (prevent races)
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    };
  }, [conversationId]);

  // Search mode toggled by Options or header
  const initialSearch = !!(params as any).search;
  const [searchMode, setSearchMode] = useState<boolean>(initialSearch);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultIndices] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const [composerVisible, setComposerVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [messageText, setMessageText] = useState('');

  // attachments picked from image picker (max 10)
  const [attachments, setAttachments] = useState<{uri: string; name: string; type: string; size?: number}[]>([]);

  const addAttachments = (files: {uri: string; name: string; type: string; size?: number}[]) => {
    setAttachments(prev => {
      const combined = [...prev, ...files].slice(0, 10);
      if (combined.length >= 10 && prev.length + files.length > 10) {
        alert('Chỉ có thể gửi tối đa 10 ảnh.');
      }
      return combined;
    });
  };

  const removeAttachment = (arg: number | string) => {
    setAttachments(prev => {
      if (typeof arg === 'number') {
        return prev.filter((_, i) => i !== arg);
      } else {
        return prev.filter(a => a.uri !== arg);
      }
    });
  };

  const clearAttachments = () => setAttachments([]);

  const onTextChange = (text: string) => {
    setMessageText(text);
    handleType();
  };

  const safeInsets = useSafeAreaInsets();
  // Khởi tạo inset từ initialWindowMetrics để tránh bị 0 ở frame đầu tiên
  const insets = useMemo(() => ({
    top: safeInsets.top || initialWindowMetrics?.insets.top || 0,
    bottom: safeInsets.bottom || initialWindowMetrics?.insets.bottom || 0,
    left: safeInsets.left || initialWindowMetrics?.insets.left || 0,
    right: safeInsets.right || initialWindowMetrics?.insets.right || 0,
  }), [safeInsets]);

  // Listen to SearchContext open events to avoid navigation flicker
  const { openFor, close } = useSearch();
  const isFocused = useIsFocused();
  const [pendingOpen, setPendingOpen] = useState(false);

  const { keyboardHeight, lastKeyboardHeight } = useKeyboardSheetHeight();
  const sheetHeightSV = useSharedValue(0);
  const sheetTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (sheetTimeoutRef.current) {
      clearTimeout(sheetTimeoutRef.current);
      sheetTimeoutRef.current = null;
    }

    const isAnySheetVisible = composerVisible || galleryVisible;
    if (isAnySheetVisible) {
      if (keyboardHeight.value > 0) {
        // Nếu bàn phím đang mở (VD: từ bàn phím bấm sang More)
        // Ta set thẳng giá trị để Chat bar bị "ghim" lại tại chỗ, không có độ trễ
        sheetHeightSV.value = lastKeyboardHeight;
      } else {
        sheetHeightSV.value = withTiming(lastKeyboardHeight, { duration: 333 });
      }
    } else {
      if (inputRef.current?.isFocused()) {
        // Khi từ sheet chuyển sang bàn phím, giữ sheetHeight một lúc để không bị dip (hụt)
        // vì keyboard đang animate lên. Sau đó snap về 0 (vì lúc này keyboardHeight đã chèn vào rồi).
        sheetTimeoutRef.current = setTimeout(() => {
          sheetHeightSV.value = 0;
        }, 350);
      } else {
        sheetHeightSV.value = withTiming(0, { duration: 333 });
      }
    }
  }, [composerVisible, galleryVisible, lastKeyboardHeight, sheetHeightSV, keyboardHeight]);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: Math.max(
        insets.bottom,
        keyboardHeight.value,
        sheetHeightSV.value
      ),
    };
  }, [insets.bottom]);

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

  // helper to remove duplicate messages by id (stringified)
  const dedupe = (list: any[]) => {
    const seen = new Set<string>();
    const uniq: any[] = [];
    for (const m of list) {
      // if there's no id we'll fall back to a generated key to avoid
      // ongoing duplicates; usually all server messages have ids though
      const key = m.id != null ? m.id.toString() : JSON.stringify(m);
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(m);
      }
    }
    return uniq;
  };

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

      const mapped = newMessages.map((m: any) => {
        const base: any = {
          ...m,
          fromMe: m.senderId ? m.senderId === user?.id : false,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contactName: m.sender?.id ? m.sender.fullName : (m.type === 'system' ? 'Hệ thống' : undefined),
          contactAvatar: m.sender?.avatar ? getAvatarUrl(m.sender.avatar) || undefined : undefined,
          seenBy: m.seenBy || [],
        };
        if (m.type === 'file' || m.type === 'image') {
          try {
            const info = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
            base.fileInfo = info;
          } catch {
            // content might already be a string path for image
            if (m.type === 'image') {
              base.fileInfo = { url: m.content };
            }
          }
        }
        return base;
      });

      if (isLoadMore) {
        setMessages(prev => dedupe([...prev, ...mapped]));
      } else {
        // initial load replaced entirely; remove any dupes just in case
        setMessages(dedupe(mapped));
        setInitialFetchDone(true);
      }

      // If we got exactly 'take' (20) messages, there's likely more.
      // If we got fewer, but it was a Load More, then we've definitely reached the end.
      // If it's the initial fetch, we still set hasMore based on count.
      setHasMore(newMessages.length >= 20);

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
  }, [conversationId, user?.id, hasMore, loadingMore, targetUserIdState, messagesRef]);

  useEffect(() => {
    if (!isFocused || !conversationId) return;
    if (initialFetchDone) return;

    const conversationIdNum = parseInt(conversationId, 10);
    
    // Join room and always fetch messages to ensure sync
    fetchMessages(false);
    fetchAllMedia(); // added to dependency list below
    socketService.emit('join_conversation', conversationIdNum);

    // Always mark as read when focusing a conversation
    chatApi.markAsRead(conversationIdNum).catch(err => {
      console.error('Mark as read focus error:', err);
    });
  }, [conversationId, isFocused, fetchMessages, fetchAllMedia, initialFetchDone]);

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
const isDuplicate = prev.find(m => m.id?.toString() === message.id?.toString());
        if (isDuplicate) return prev;

        // prepare parsed version of incoming message so we can compare
        let incomingFileName: string | undefined;
        if (message.type === 'file' || message.type === 'image') {
          try {
            const info = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
            incomingFileName = info?.name;
          } catch {
            if (message.type === 'image') {
              incomingFileName = undefined;
            }
          }
        }

        let tempIdx = -1;
        if (message.type === 'file' || message.type === 'image') {
          tempIdx = prev.findIndex(
            m => m.status === 'sending' && m.type === message.type && m.fileName && incomingFileName && m.fileName === incomingFileName && m.senderId === message.senderId
          );
        } else {
          tempIdx = prev.findIndex(
            m => m.status === 'sending' && m.content === message.content && m.senderId === message.senderId
          );
        }

        const mappedMessage: any = {
          ...message,
          fromMe: message.senderId ? message.senderId === user?.id : false,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contactName: message.sender?.id ? message.sender.fullName : (message.type === 'system' ? 'Hệ thống' : undefined),
          contactAvatar: message.sender?.avatar ? getAvatarUrl(message.sender.avatar) || undefined : undefined,
          seenBy: message.seenBy || [],
          status: 'sent',
        };
        if (message.type === 'file' || message.type === 'image') {
          try {
            const info = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
            mappedMessage.fileInfo = info;
          } catch {
            if (message.type === 'image') mappedMessage.fileInfo = { url: message.content };
          }
        }

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

    // Also listen for system notifications that might not be 'new_message'
    const handleConversationUpdated = (data: any) => {
      if (data.conversationId?.toString() === conversationId?.toString()) {
        if (data.action === 'members_added' || data.action === 'member_left') {
          // Re-fetch messages to get the system messages created on backend
          fetchMessages(false);
          // If it was group details update, fetch that too
          if (isGroup) fetchGroupDetails();
        }
      }
    };

    socketService.on('conversation_updated', handleConversationUpdated);

    return () => {
      if (conversationIdNum) socketService.emit('leave_conversation', conversationIdNum);
      socketService.off('new_message');
      socketService.off('message_seen');
      socketService.off('conversation_updated', handleConversationUpdated);
    };
  }, [conversationId, user?.id, isFocused, fetchMessages, fetchGroupDetails, isGroup]);

  const handleSend = async () => {
    // if attachments exist, send them first (and clear afterwards)
    if (attachments.length > 0) {
      // iterate sequentially to preserve order
      for (const file of attachments) {
        await handleSendAttachment(file);
      }
      setAttachments([]);
      return;
    }

    if (!messageText.trim()) return;
    await handleSendText(messageText.trim());
  };

  const handleSendText = async (text: string) => {
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
          const convId = conv.id || conv.conversationId;
          if (convId) {
            setConversationId(convId.toString());
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
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageText(text);
    }
  };

  const handleSendAttachment = async (
    file: { uri: string; name: string; type: string; size?: number },
    caption?: string
  ) => {
    if (!file) return;
    if (file.size && file.size > 5 * 1024 * 1024) {
      alert('File must be smaller than 5MB');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const tempMessage: any = {
      id: tempId,
      content: file.uri,
      fromMe: true,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
      type: file.type.startsWith('image/') ? 'image' : 'file',
      fileName: file.name,
    };

    try {
      let targetConversationId = conversationId;

      // ensure conversation exists
      if (isNewConversation && !conversationId) {
        setMessages([tempMessage]);
        setCreatingConversation(true);
        try {
          const response = await chatApi.startConversation(Number(targetUserIdState), caption || '', file);
          const conv = response.data;
          const convId = conv.id || conv.conversationId;
          if (convId) {
            targetConversationId = convId.toString(); // <--- update variable
            setConversationId(targetConversationId);
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
          // after creating the conversation we've already sent the file
          return;
        } catch (err) {
          console.error('Error creating conversation on attachment send:', err);
          setMessages([]);
          return;
        } finally {
          setCreatingConversation(false);
        }
      }

      setMessages(prev => [tempMessage, ...prev]);

      // prepare upload file; convert content:// to file:// via copy
      let uploadFile = file;
      if (file.uri && file.uri.startsWith('content://')) {
        try {
          const dest = `${(FileSystem as any).cacheDirectory}${file.name}`;
          await (FileSystem as any).copyAsync({ from: file.uri, to: dest });
          uploadFile = { uri: dest, name: file.name, type: file.type };
        } catch (e) {
          console.warn('Failed to copy content URI, using original', e);
        }
      }

      await chatApi.sendMessage(Number(targetConversationId), caption || '', '', uploadFile);
    } catch (err) {
      console.error('Attachment send error:', err);
      alert('Không thể gửi tệp, vui lòng thử lại');
      setMessages(prev => prev.filter(m => m.id !== tempId));
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
    lastKeyboardHeight,
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
    galleryVisible,
    setGalleryVisible,
    messageText,
    onTextChange,
    insets,
    animatedContentStyle,
    fetchMessages,
    handleSend,
    handleSendAttachment,
    // new attachment helpers
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    targetUser,
    targetUserStatus,
    isGroup,
    groupAvatars,
    membersCount,
    allMedia,
    fetchAllMedia,
    loadingMoreMedia,
    hasMoreMedia
  };
}
