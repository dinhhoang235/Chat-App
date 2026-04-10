import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { setActiveConversationId, activeConversationId } from '@/services/notificationState';
import { FlatList, Alert } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useKeyboardSheetHeight } from './useKeyboardSheetHeight';
import { useTheme } from '@/context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSearch } from '@/context/searchContext';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { userAPI } from '@/services/user';
import { chatApi } from '@/services/chat';
import { storageApi } from '@/services/storage';
import { compressImage } from '@/services/imageUpload';
import { socketService } from '@/services/socket';
import { useAuth } from '@/context/authContext';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';
import { useTyping } from './useTyping';
import * as DocumentPicker from 'expo-document-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { prepareAttachmentForUpload } from '@/services/mediaUpload';

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
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [allMedia, setAllMedia] = useState<any[]>([]);
  const [loadingMoreMedia, setLoadingMoreMedia] = useState(false);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

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
        if (!fileInfo && (m.type === 'file' || m.type === 'image' || m.type === 'video')) {
          try {
            fileInfo = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
          } catch {
            if (m.type === 'image' || m.type === 'video') {
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
      return [...groupDetails.participants]
        .sort((a: any, b: any) => a.id - b.id)
        .map((p: any) => ({
          url: p.user.avatar ? getAvatarUrl(p.user.avatar) : null,
          name: p.user.fullName,
          initials: getInitials(p.user.fullName)
        }));
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
  const [resultIndices, setResultIndices] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Message processing - group consecutive images
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const withDates: any[] = [];
    const formatDate = (dateStr: string) => {
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
      } else if (isSameDay(d, yesterday)) {
        return `${time} Hôm qua`;
      } else {
        return `${time} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      }
    };

    const grouped: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      // Only group confirmed image messages from the same sender sent very close together
      // Note: messages is inverted (0 is newest).
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
            images: [...groupImages].reverse(), // reverse to show oldest first in grid
          });
          i = j - 1;
          continue;
        }
      }

      grouped.push(msg);
    }

    // Now inject date separators into the grouped list
    for (let i = 0; i < grouped.length; i++) {
      const msg = grouped[i];
      withDates.push(msg);

      const nextMsg = grouped[i + 1];
      const currentDate = formatDate(msg.createdAt);
      const nextDate = nextMsg ? formatDate(nextMsg.createdAt) : null;

      if (!nextMsg || currentDate !== nextDate) {
        // If there's no next message (oldest message) OR the next message is from a different day,
        // we add a date separator here.
        // Wait, in an inverted list, msg is newer than nextMsg.
        // So after we've pushed all messages of "Today", we see "Yesterday".
        // We push a separator for "Today" here.
        withDates.push({
          id: `date-${msg.id || i}`,
          type: 'date_separator',
          date: getSeparatorText(msg.createdAt),
          createdAt: msg.createdAt, // keep for sorting/ref
        });
      }
    }

    return withDates;
  }, [messages]);

  const scrollToMessageId = useCallback((messageId: string) => {
    // messageId could be from replyTo which might be a number or string
    const targetId = messageId.toString();
    const idx = processedMessages.findIndex(m => m.id?.toString() === targetId);
    
    if (idx !== -1) {
      flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    } else {
      console.log('Message not found in current list:', targetId);
    }
  }, [processedMessages]);

  // Search logic - find indices of messages that match the search query
  useEffect(() => {
    if (!searchMode || !searchQuery.trim()) {
      setResultIndices([]);
      setCurrentResultIndex(0);
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await chatApi.searchMessages(Number(conversationId), searchQuery);
        const results = response.data;
        setSearchResults(results);
        
        // Results are handled via currentResultIndices memo below
        setCurrentResultIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, conversationId]);

  // Calculate result indices based on PROCESSED messages
  const currentResultIndices = useMemo(() => {
    if (!searchQuery.trim() || !searchResults.length) return [];
    const indicesSet = new Set<number>();

    searchResults.forEach((res: any) => {
      const idx = processedMessages.findIndex(m => {
        // Direct match
        if (m.id === res.id) return true;
        // Match inside image group
        if (m.type === 'image_group' && (m as any).images) {
          return (m as any).images.some((img: any) => img.id === res.id);
        }
        return false;
      });
      if (idx !== -1) indicesSet.add(idx);
    });

    return Array.from(indicesSet).sort((a, b) => a - b);
  }, [searchQuery, searchResults, processedMessages]);

  const [composerVisible, setComposerVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [micVisible, setMicVisible] = useState(false);
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

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    handleType();
  };

  const handleBackspace = () => {
    setMessageText(prev => {
      const chars = Array.from(prev);
      if (chars.length === 0) return prev;
      return chars.slice(0, -1).join('');
    });
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

    const isAnySheetVisible = composerVisible || galleryVisible || emojiVisible || micVisible;
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
  }, [composerVisible, galleryVisible, emojiVisible, micVisible, lastKeyboardHeight, sheetHeightSV, keyboardHeight]);

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
        if (m.type === 'file' || m.type === 'image' || m.type === 'video') {
          // If message already has a fileInfo (like temp messages), keep it.
          // Otherwise try parsing from content string.
          if (m.fileInfo && m.fileInfo.size) {
            base.fileInfo = m.fileInfo;
          } else {
            try {
              const info = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
              base.fileInfo = info;
            } catch {
              if (m.type === 'image' || m.type === 'video') {
                base.fileInfo = { url: m.content };
              }
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
        if (message.type === 'file' || message.type === 'image' || message.type === 'video') {
          try {
            const info = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
            incomingFileName = info?.name;
          } catch {
            if (message.type === 'image' || message.type === 'video') {
              incomingFileName = undefined;
            }
          }
        }

        let tempIdx = -1;
        if (message.tempId) {
          tempIdx = prev.findIndex(m => m.id?.toString() === message.tempId.toString());
        }
        
        if (tempIdx === -1) {
          if (message.type === 'file' || message.type === 'image' || message.type === 'video') {
            tempIdx = prev.findIndex(
              m => m.status === 'sending' && m.type === message.type && m.fileName && incomingFileName && m.fileName === incomingFileName && m.senderId === message.senderId
            );
          } else {
            tempIdx = prev.findIndex(
              m => m.status === 'sending' && m.content === message.content && m.senderId === message.senderId
            );
          }
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
        if (message.type === 'file' || message.type === 'image' || message.type === 'video') {
          if (message.fileInfo && message.fileInfo.size) {
             mappedMessage.fileInfo = message.fileInfo;
          } else {
            try {
              const info = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
              mappedMessage.fileInfo = info;
            } catch {
              if (message.type === 'image' || message.type === 'video') mappedMessage.fileInfo = { url: message.content };
            }
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
      setGalleryVisible(false); // Close gallery when sending
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

    const replyToSnapshot = replyingTo;
    setReplyingTo(null);

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: text,
      fromMe: true,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
      replyTo: replyToSnapshot
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

      const response = await chatApi.sendMessage(Number(targetConversationId), text, 'text', undefined, replyToSnapshot?.id, tempId);
      const sentMessage = response.data;
      
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === tempId);
        if (idx !== -1) {
          const newMessages = [...prev];
          newMessages[idx] = {
            ...sentMessage,
            fromMe: true,
            time: new Date(sentMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
          };
          return newMessages;
        }
        return prev;
      });
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageText(text);
    }
  };

  const handleSendAttachment = async (
    file: { uri: string; name: string; type: string; size?: number; duration?: number },
    caption?: string
  ) => {
    if (!file) return;
    const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024;

    // Tăng giới hạn lên 100MB nhờ Chunked Upload
    if (file.size && file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      alert('Tệp quá lớn, giới hạn là 100MB');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const replyToSnapshot = replyingTo;
    setReplyingTo(null);

    const preparedAttachment = await prepareAttachmentForUpload(file);
    const uploadFileUri = preparedAttachment.uploadUri;
    const uploadFileName = preparedAttachment.uploadName;
    const uploadSize = preparedAttachment.uploadSize ?? file.size;

    const tempMessage: any = {
      id: tempId,
      content: uploadFileUri,
      fromMe: true,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
      replyTo: replyToSnapshot,
      type: file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'file'),
      fileName: file.name,
      fileInfo: {
        url: uploadFileUri,
        size: uploadSize,
        mime: file.type
      }
    };

    try {
      let targetConversationId = conversationId;

      // ensure conversation exists
      if (isNewConversation && !conversationId) {
        setMessages([tempMessage]);
        setCreatingConversation(true);
        try {
          const isImage = file.type.startsWith('image/');

          // Upload (Chunked if large)
          let finalUrl = '';
          let thumbnailUrl = '';
          const isLargeFile = uploadSize && uploadSize > 5 * 1024 * 1024;
          const isVideo = file.type.startsWith('video/');

          // 1. Tạo thumbnail nếu là video
          if (isVideo) {
            try {
              const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(file.uri, { time: 0 });
              const thumbName = `thumb_${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
              const { uploadUrl: thumbTarget, finalUrl: thumbFinal, headers: thumbHeaders } = await storageApi.getUploadUrl(thumbName, 'image/jpeg');
              await storageApi.uploadToPresignedUrl(thumbTarget, thumbUri, thumbHeaders['Content-Type']);
              thumbnailUrl = thumbFinal;
            } catch (e) {
              console.warn('Thumbnail generation failed', e);
            }
          }
          
          if (isLargeFile) {
            finalUrl = await storageApi.uploadFileChunked(
              uploadFileUri, 
              uploadFileName, 
              file.type, 
              uploadSize!,
              (p) => setUploadProgress(prev => ({ ...prev, [tempId]: p }))
            );
          } else {
            const { uploadUrl, finalUrl: fetchedUrl, headers } = await storageApi.getUploadUrl(uploadFileName, file.type);
            setUploadProgress(prev => ({ ...prev, [tempId]: 0.1 })); // Bắt đầu upload
            await storageApi.uploadToPresignedUrl(uploadUrl, uploadFileUri, headers['Content-Type']);
            finalUrl = fetchedUrl;
            setUploadProgress(prev => ({ ...prev, [tempId]: 1 })); // Xong
          }

          const fileInfo = {
            url: finalUrl,
            name: file.name,
            size: uploadSize,
            mime: file.type,
            duration: file.duration,
            thumbnailUrl: thumbnailUrl || undefined
          };

          const response = await chatApi.startConversation(
            Number(targetUserIdState), 
            JSON.stringify(fileInfo),
            undefined,
            isImage ? 'image' : (file.type.startsWith('video/') ? 'video' : 'file')
          );
          
          const conv = response.data;
          const convId = conv.id || conv.conversationId;
          if (convId) {
            targetConversationId = convId.toString(); 
            setConversationId(targetConversationId);
            const lastMessage = conv.messages?.[0];
            if (lastMessage) {
              let mappedMessage = {
                ...lastMessage,
                fromMe: true,
                time: new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent',
              };
              try {
                mappedMessage.fileInfo = typeof lastMessage.content === 'string' ? JSON.parse(lastMessage.content) : lastMessage.content;
              } catch {
                if (lastMessage.type === 'image') mappedMessage.fileInfo = { url: lastMessage.content };
              }
              setMessages([mappedMessage]);
            }
          }
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
      const isImage = file.type.startsWith('image/');

      // Upload (Chunked if large)
      let finalFileUrl = '';
      let thumbnailUrl = '';
      try {
        const isLargeFile = uploadSize && uploadSize > 5 * 1024 * 1024;
        const isVideo = file.type.startsWith('video/');

        // 1. Tạo thumbnail nếu là video
        if (isVideo) {
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(file.uri, { time: 0 });
            const thumbName = `thumb_${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
            const { uploadUrl: thumbTarget, finalUrl: thumbFinal, headers: thumbHeaders } = await storageApi.getUploadUrl(thumbName, 'image/jpeg');
            await storageApi.uploadToPresignedUrl(thumbTarget, thumbUri, thumbHeaders['Content-Type']);
            thumbnailUrl = thumbFinal;
          } catch (e) {
            console.warn('Thumbnail generation failed', e);
          }
        }
        
        if (isLargeFile) {
          // Chunked upload
          finalFileUrl = await storageApi.uploadFileChunked(
            uploadFileUri, 
            uploadFileName, 
            file.type, 
            uploadSize!,
            (p) => setUploadProgress(prev => ({ ...prev, [tempId]: p }))
          );
        } else {
          // Lấy link upload (Single PUT)
          const { uploadUrl, finalUrl, headers } = await storageApi.getUploadUrl(uploadFileName, file.type);
          setUploadProgress(prev => ({ ...prev, [tempId]: 0.1 })); // Bắt đầu
          await storageApi.uploadToPresignedUrl(uploadUrl, uploadFileUri, headers['Content-Type']);
          finalFileUrl = finalUrl;
          setUploadProgress(prev => ({ ...prev, [tempId]: 1 }));
        }
      } catch (e) {
        console.error('Upload failed', e);
        throw new Error('Upload failed');
      }

      // 3. Gửi tin nhắn kèm metadata file
      const fileInfo = {
        url: finalFileUrl,
        name: file.name,
        size: uploadSize,
        mime: file.type,
        duration: file.duration,
        thumbnailUrl: thumbnailUrl || undefined
      };

      const response = await chatApi.sendMessage(
        Number(targetConversationId), 
        JSON.stringify(fileInfo), 
        isImage ? 'image' : (file.type.startsWith('video/') ? 'video' : 'file'), 
        undefined, 
        replyToSnapshot?.id, 
        tempId
      );
      
      const sentMessage = response.data;

      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === tempId);
        if (idx !== -1) {
          const newMessages = [...prev];
          const mapped: any = {
            ...sentMessage,
            fromMe: true,
            time: new Date(sentMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
          };
          if (sentMessage.type === 'image' || sentMessage.type === 'file' || sentMessage.type === 'video') {
            try {
              mapped.fileInfo = typeof sentMessage.content === 'string' ? JSON.parse(sentMessage.content) : sentMessage.content;
            } catch {
              if (sentMessage.type === 'image' || sentMessage.type === 'video') mapped.fileInfo = { url: sentMessage.content };
            }
          }
          newMessages[idx] = mapped;
          return newMessages;
        }
        return prev;
      });
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

  const pickDocument = async () => {
    try {
      const res: any = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      let uri: string | undefined;
      let name: string | undefined;
      let mime: string | undefined;
      let size: number | undefined;

      if (res.uri) {
        uri = res.uri;
        name = res.name;
        mime = res.mimeType;
        size = res.size;
      } else if (res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        uri = asset.uri;
        name = asset.name;
        mime = asset.mimeType;
        size = asset.size;
      }

      if (uri) {
        if (size && size > 100 * 1024 * 1024) {
          Alert.alert('Tệp quá lớn', 'Vui lòng chọn tệp nhỏ hơn 100MB.');
          return;
        }
        handleSendAttachment({ uri, name: name || 'file', type: mime || 'application/octet-stream', size });
      }
    } catch (err) {
      console.error('Document picker error', err);
    }
  };

  const statusText = useMemo(() => {
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
  }, [isGroup, targetUserStatus]);

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
    searchResults,
    processedMessages,
    currentResultIndices,
    composerVisible,
    setComposerVisible,
    galleryVisible,
    setGalleryVisible,
    emojiVisible,
    setEmojiVisible,
    micVisible,
    setMicVisible,
    messageText,
    onTextChange,
    handleEmojiSelect,
    handleBackspace,
    insets,
    animatedContentStyle,
    fetchMessages,
    handleSend,
    handleSendAttachment,
    pickDocument,
    statusText,
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
    hasMoreMedia,
    replyingTo,
    setReplyingTo,
    highlightedMessageId,
    scrollToMessageId,
    uploadProgress
  };
}
