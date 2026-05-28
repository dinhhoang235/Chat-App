import React from 'react';
import { getMessageSize, setMessageSize } from '@/utils/messageSizeCache';
import { View, ActivityIndicator, Image, TouchableOpacity, Text, BackHandler, Platform, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { Header, GallerySheet, EmojiSheet, GiphySheet, TypingDots, ChatAvatar, GroupAvatar, InThreadSearch, MessageBubble, ComposerActionsSheet, ComposerMicSheet, ChatComposer, GroupVideoCallModal, MessageMenuModal, DeleteMessageSheet, LocationPreviewModal, ForwardMessageSheet, ShareContactModal, ReactionSheet, ReactionsDetailSheet } from '@/components';
import { resolveMediaUri } from '@/components/chat/messageParts/messageHelpers';
import useSheetControl from '@/hooks/useSheetControl';
import { useChatThread } from '@/hooks/useChatThread';
import { useGroupCallAction } from '@/hooks/useGroupCallAction';
import { useCall } from '@/context/callContext';
import { useAuth } from '@/context/authContext';
import { chatApi } from '@/services/chat';
import { socketService } from '@/services/socket';
import { checkFriendshipStatus, sendFriendRequest } from '@/services/friendship';
import { chatThreadCache } from '@/utils/chatThreadCache';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function ChatThread() {
  const DEFAULT_COMPOSER_HEIGHT = 74;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const renderStartedAt = globalThis?.performance?.now?.() ?? Date.now();
  const mountedAtRef = React.useRef(globalThis?.performance?.now?.() ?? Date.now());
  const loggedFirstLayoutRef = React.useRef(false);
  const loggedChatListReadyRef = React.useRef(false);
  const loggedDeferredChromeReadyRef = React.useRef(false);
  const loggedFlashListLayoutRef = React.useRef(false);
  const loggedFirstItemRenderRef = React.useRef(false);
  const thumbnailPrefetchRunRef = React.useRef<string | null>(null);
  const sizePrefillRunRef = React.useRef<string | null>(null);
  const mediaPrefetchRunRef = React.useRef<string | null>(null);
  const [micTextMode, setMicTextMode] = React.useState(false);
  const [micOutsideCloseLocked, setMicOutsideCloseLocked] = React.useState(false);
  const [micVoiceFlowActive, setMicVoiceFlowActive] = React.useState(false);
  const [groupVideoCallVisible, setGroupVideoCallVisible] = React.useState(false);
  const [composerHeight, setComposerHeight] = React.useState(DEFAULT_COMPOSER_HEIGHT);
  
  const [messageMenuVisible, setMessageMenuVisible] = React.useState(false);
  const [messageMenuPos, setMessageMenuPos] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [showMoreMenuActions, setShowMoreMenuActions] = React.useState(false);
  const [selectedMessage, setSelectedMessage] = React.useState<any>(null);
  const [editingMessage, setEditingMessage] = React.useState<any>(null);
  const [deleteSheetVisible, setDeleteSheetVisible] = React.useState(false);
  const [locationModalVisible, setLocationModalVisible] = React.useState(false);
  const [shareContactModalVisible, setShareContactModalVisible] = React.useState(false);
  const hasUserScrolledRef = React.useRef(false);
  const lastLoadMoreAtRef = React.useRef(0);

  const [forwardSheetVisible, setForwardSheetVisible] = React.useState(false);
  
  const { user } = useAuth();
  const [reactionSheetVisible, setReactionSheetVisible] = React.useState(false);
  const [reactionsDetailVisible, setReactionsDetailVisible] = React.useState(false);

  const [gifVisible, setGifVisible] = React.useState(false);
  const [richMessageChromeReady, setRichMessageChromeReady] = React.useState(false);
  const [chatListReady, setChatListReady] = React.useState(false);

  if (__DEV__) {
    const tapAt = (globalThis as any).__chatOpenTapAt;
    console.log('[chat-open] render start', {
      conversationId: String((globalThis as any).__chatOpenTapConversationId ?? params?.id ?? ''),
      sinceTapMs: typeof tapAt === 'number' ? Math.round(renderStartedAt - tapAt) : null,
      renderStartedAt: Math.round(renderStartedAt),
    });
  }

  const scheduleLowPriorityTask = React.useCallback((task: () => void) => {
    const requestIdle = (globalThis as any).requestIdleCallback;
    if (typeof requestIdle === 'function') {
      const handle = requestIdle(task, { timeout: 500 });
      return () => {
        try {
          (globalThis as any).cancelIdleCallback?.(handle);
        } catch {}
      };
    }

    const timeoutId = setTimeout(task, 0);
    return () => clearTimeout(timeoutId);
  }, []);
  const {
    colors,
    params,
    router,
    id,
    paramName,
    targetUserId,
    targetUserIdState,
    messages,
    loading,
    loadingMore,
    hasMore,
    creatingConversation,
    isTyping,
    displayTypingAvatar,
    typingUserInitials,
    flatListRef,
    inputRef,
    searchMode,
    setSearchMode,
    searchQuery,
    setSearchQuery,
    currentResultIndex,
    setCurrentResultIndex,
    composerVisible,
    setComposerVisible,
    galleryVisible,
    setGalleryVisible,
    emojiVisible,
    setEmojiVisible,
    micVisible,
    setMicVisible,
    messageText,
    setMessageText,
    onTextChange,
    handleEmojiSelect,
    handleBackspace,
    insets,
    animatedContentStyle,
    fetchMessages,
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    conversationId,
    setMessages,
    targetUserStatus,
    targetUser,
    isGroup,
    groupAvatars,
    membersCount,
    lastKeyboardHeight,
    processedMessages,
    currentResultIndices,
    statusText,
    handleSend,
    handleSendLocationData,
    isSendingLocation,
    handleSendGif,
    isSendingGif,
    handleRetryMessage,
    sendTextDirect,
    handleSendAttachment,
    pickDocument,
    replyingTo,
    setReplyingTo,
    highlightedMessageId,
    scrollToMessageId,
    uploadProgress,
    startVoiceCall,
    startVideoCall,
    startGroupVideoCall,
    handleGroupVideoHeaderPress,
    allMedia,
    deleteMessage
  } = useChatThread({
    gifVisible,
    openGroupVideoCallModal: React.useCallback(() => {
      setGroupVideoCallVisible(true);
    }, []),
  });

  React.useEffect(() => {
    if (!__DEV__) return;
    const mountedAt = mountedAtRef.current;
    const tapAt = (globalThis as any).__chatOpenTapAt;
    const tapConversationId = (globalThis as any).__chatOpenTapConversationId;
    console.log('[chat-open] screen mount', {
      conversationId,
      mountedAt: Math.round(mountedAt),
      sinceTapMs: typeof tapAt === 'number' ? Math.round((globalThis?.performance?.now?.() ?? Date.now()) - tapAt) : null,
      tapConversationId: tapConversationId ?? null,
    });
  }, [conversationId]);

  React.useEffect(() => {
    setRichMessageChromeReady(false);
    setChatListReady(false);

    const requestFrame = (globalThis as any).requestAnimationFrame;
    const cancelFrame = (globalThis as any).cancelAnimationFrame;

    const frameId =
      typeof requestFrame === 'function'
        ? requestFrame(() => {
            setChatListReady(true);
            setRichMessageChromeReady(true);
          })
        : setTimeout(() => {
            setChatListReady(true);
            setRichMessageChromeReady(true);
          }, 0);

    return () => {
      if (typeof cancelFrame === 'function' && typeof frameId === 'number') {
        cancelFrame(frameId);
      } else {
        clearTimeout(frameId as ReturnType<typeof setTimeout>);
      }
    };
  }, [conversationId]);

  React.useEffect(() => {
    if (!__DEV__) return;
    console.log('[chat-screen] state snapshot', {
      conversationId,
      messages: messages.length,
      processedMessages: processedMessages.length,
      loading,
      loadingMore,
      hasMore,
    });
  }, [conversationId, messages.length, processedMessages.length, loading, loadingMore, hasMore]);

  // Run a small prewarm for visible thumbnails in background to improve
  // perceived load time. Do NOT block rendering; FlashList should mount
  // immediately to avoid spinner/blank issues.

  const handleReactMessage = React.useCallback(async (message: any, emoji: string) => {
    if (!conversationId) return;
    
    // Optimistic UI updates
    const currentReaction = message.reactions?.find((r: any) => r.userId === user?.id)?.reaction;
    let nextReactions = message.reactions ? [...message.reactions] : [];
    
    if (currentReaction === emoji) {
      nextReactions = nextReactions.filter((r: any) => r.userId !== user?.id);
    } else {
      nextReactions = nextReactions.filter((r: any) => r.userId !== user?.id);
      nextReactions.push({
        reaction: emoji,
        userId: user?.id,
        user: {
          id: user?.id,
          fullName: user?.fullName || 'Me',
          avatar: user?.avatar,
        },
        createdAt: new Date().toISOString(),
      });
    }

    setMessages((prev) => {
      const next = prev.map((m) =>
        m.id === message.id ? { ...m, reactions: nextReactions } : m
      );
      chatThreadCache.setMessages(conversationId, next);
      return next;
    });

    try {
      const reactionToSend = currentReaction === emoji ? null : emoji;
      await chatApi.reactMessage(conversationId, message.id, reactionToSend);
    } catch (err) {
      console.error("Failed to react to message:", err);
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id === message.id ? { ...m, reactions: message.reactions || [] } : m
        );
        chatThreadCache.setMessages(conversationId, next);
        return next;
      });
    }
  }, [conversationId, user, setMessages]);

  const canForwardMessage = React.useMemo(() => {
    if (!selectedMessage || !selectedMessage.id) return false;

    const isTempMessage = selectedMessage.id?.toString?.().startsWith?.('temp-');

    return (
      !isTempMessage &&
      selectedMessage.status !== 'sending' &&
      selectedMessage.status !== 'error'
    );
  }, [selectedMessage]);
  const { activeCall, callStatus } = useCall();
  const [remoteActiveGroupCall, setRemoteActiveGroupCall] = React.useState(false);
  
  const [friendshipStatus, setFriendshipStatus] = React.useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (isGroup || !targetUserIdState) return;

    const checkStatus = async () => {
      try {
        const res = await checkFriendshipStatus(Number(targetUserIdState));
        if (!mounted) return;

        let mappedStatus = 'NONE';
        const s = res;

        if (s.status === 'request_received') {
          mappedStatus = 'PENDING_RECEIVED';
        } else if (s.status === 'request_sent') {
          mappedStatus = s.requestStatus === 'rejected' ? 'NONE' : 'PENDING_SENT';
        } else if (['friends', 'accepted', 'friend'].includes(s.status)) {
          mappedStatus = 'ACCEPTED';
        } else if (s.status) {
          mappedStatus = s.status.toUpperCase();
        }

        setFriendshipStatus(mappedStatus);
      } catch (err) {
        console.log(err);
      }
    };

    // Defer network call so it doesn't compete with first paint.
    const cancel = scheduleLowPriorityTask(() => {
      void checkStatus();
    });

    return () => { mounted = false; cancel(); };
  }, [isGroup, targetUserIdState, scheduleLowPriorityTask]);

  const handleSendFriendRequest = async () => {
    if (!targetUserIdState) return;
    try {
      setSendingRequest(true);
      await sendFriendRequest(Number(targetUserIdState));
      setFriendshipStatus('PENDING_SENT');
    } catch {
      // ignore
    } finally {
      setSendingRequest(false);
    }
  };

  const showFriendBanner = !isGroup && targetUserIdState && (friendshipStatus === 'NONE' || friendshipStatus === 'PENDING_SENT');

  // Handle Android hardware back to ensure we return to chat list when opened from Profile
  React.useEffect(() => {
    const onHardwareBack = () => {
      try {
        if ((params as any)?.fromProfile === 'true') {
          router.replace('/(tabs)');
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    };

    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => subscription.remove();
    }
    // no-op on other platforms
    return;
  }, [params, router]);

  const activeCallConversationId = activeCall?.conversationId;
  const activeCallGroupSize =
    activeCall?.targetUserIds?.length ??
    Math.max(0, (activeCall?.groupTargets?.length ?? 0) - 1);
  const isActiveGroupCall = Boolean(
    (activeCallConversationId != null &&
      String(activeCallConversationId) === String(id) &&
      activeCall?.callType === 'video' &&
      activeCallGroupSize > 1 &&
      callStatus !== 'ended') || remoteActiveGroupCall
  );

  const handleCallAction = useGroupCallAction(() => setGroupVideoCallVisible(true));

  const handleSaveEdit = React.useCallback(async () => {
    if (!editingMessage || !conversationId) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;

    let previousMessages: any[] = [];
    const messageIdStr = editingMessage.id?.toString();

    setMessages((prev) => {
      previousMessages = prev;
      const next = prev.map((m) =>
        m.id?.toString() === messageIdStr
          ? { ...m, content: trimmed, text: trimmed, updatedAt: new Date().toISOString(), edited: true }
          : m
      );
      chatThreadCache.setMessages(conversationId, next);
      return next;
    });

    setEditingMessage(null);
    setMessageText('');

    try {
      const response = await chatApi.editMessage(Number(conversationId), editingMessage.id, trimmed);
      const updated = response.data;
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id?.toString() === updated.id?.toString()
            ? { ...m, content: updated.content, text: updated.content, updatedAt: updated.updatedAt, edited: true }
            : m
        );
        chatThreadCache.setMessages(conversationId, next);
        return next;
      });
    } catch (err) {
      console.error('Edit message error:', err);
      setMessages(previousMessages);
      chatThreadCache.setMessages(conversationId, previousMessages);
      setEditingMessage(editingMessage);
      setMessageText(trimmed);
    }
  }, [conversationId, editingMessage, messageText, setMessageText, setMessages]);

  React.useEffect(() => {
    let mounted = true;
    const checkGroupCall = async () => {
      if (!isGroup || !id) {
        if (mounted) setRemoteActiveGroupCall(false);
        return;
      }

      try {
        const response = await new Promise<any>((resolve) => {
          socketService.emit('query_active_call', { conversationId: id }, (res: any) => {
            resolve(res);
          });
        });
        const info = response?.callInfo;
        const isRemoteActive = Boolean(
          info?.callType === 'video' &&
          (info?.invitedUserIds?.length ?? 0) > 1 &&
          response?.callId
        );
        if (mounted) setRemoteActiveGroupCall(isRemoteActive);
      } catch {
        if (mounted) setRemoteActiveGroupCall(false);
      }
    };

    // Defer the group-call probe to avoid blocking mount.
    const cancel = scheduleLowPriorityTask(() => {
      void checkGroupCall();
    });

    return () => {
      mounted = false;
      cancel();
    };
  }, [id, isGroup, scheduleLowPriorityTask]);

  // unified sheet control (gallery/composer) moved to hook
  const { openSheet, closeAll, sheetHeight } = useSheetControl(
    inputRef,
    composerVisible,
    setComposerVisible,
    galleryVisible,
    setGalleryVisible,
    emojiVisible,
    setEmojiVisible,
    micVisible,
    setMicVisible,
    lastKeyboardHeight
  );

  const renderItem = React.useCallback(({ item, index }: any) => {
    if (item.type === 'date_separator') {
      return (
        <View className="items-center my-4">
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
            {item.date}
          </Text>
        </View>
      );
    }

    const nextMessage = processedMessages[index - 1]; 
    const isLastInConsecutiveGroup = !nextMessage || nextMessage.senderId !== item.senderId;
    const isThreadLast = index === 0;

    return (
      <MessageBubble
        message={item}
        simple={!richMessageChromeReady}
        highlightQuery={searchQuery}
        isLastInGroup={isLastInConsecutiveGroup}
        isThreadLast={isThreadLast}
        contactAvatarFallback={!isGroup ? (targetUser?.avatar || (params.avatar as string | undefined)) : undefined}
        onPress={() => {
          if (composerVisible) closeAll();
          if (gifVisible) setGifVisible(false);
        }}
        onAvatarPress={() => {
          if (item.fromMe) return router.push('/profile/me');
          router.push(`/profile/${item.senderId}`);
        }}
        onReply={() => setReplyingTo(item)}
        isHighlighted={item.id?.toString() === highlightedMessageId}
        onReplyPress={(replyId: string) => scrollToMessageId(replyId)}
        progress={uploadProgress[item.id]}
        allMedia={allMedia}
        onVoiceCall={startVoiceCall}
        onVideoCall={startVideoCall}
        onCallAction={handleCallAction}
        isGroupThread={isGroup}
        onRetry={handleRetryMessage}
        onLongPress={(msg, x, y, w, h) => {
          setSelectedMessage(msg);
          setMessageMenuPos({ x, y, w, h });
          setShowMoreMenuActions(false);
          setMessageMenuVisible(true);
        }}
        onReactPress={(msg) => {
          setSelectedMessage(msg);
          if (msg.reactions && msg.reactions.length > 0) {
            setReactionsDetailVisible(true);
          } else {
            setReactionSheetVisible(true);
          }
        }}
      />
    );
  }, [processedMessages, colors, searchQuery, composerVisible, gifVisible, router, highlightedMessageId, uploadProgress, closeAll, setReplyingTo, scrollToMessageId, allMedia, startVoiceCall, startVideoCall, handleCallAction, isGroup, targetUser?.avatar, params.avatar, handleRetryMessage, setReactionSheetVisible, setReactionsDetailVisible, richMessageChromeReady]);

  const maybeCloseAll = React.useCallback(() => {
    if (micOutsideCloseLocked) return;
    closeAll();
    if (gifVisible) setGifVisible(false);
  }, [micOutsideCloseLocked, closeAll, gifVisible]);

  const renderDeferredChrome =
    chatListReady ||
    groupVideoCallVisible ||
    messageMenuVisible ||
    locationModalVisible ||
    forwardSheetVisible ||
    deleteSheetVisible ||
    shareContactModalVisible ||
    reactionSheetVisible ||
    reactionsDetailVisible ||
    galleryVisible ||
    emojiVisible ||
    composerVisible ||
    gifVisible ||
    micVisible;

  React.useEffect(() => {
    if (!__DEV__ || loggedChatListReadyRef.current) return;
    if (!chatListReady) return;
    loggedChatListReadyRef.current = true;
    const tapAt = (globalThis as any).__chatOpenTapAt;
    console.log('[chat-open] chatListReady', {
      conversationId,
      sinceTapMs: typeof tapAt === 'number' ? Math.round((globalThis?.performance?.now?.() ?? Date.now()) - tapAt) : null,
      sinceMountMs: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - mountedAtRef.current),
      processedMessages: processedMessages.length,
    });
  }, [chatListReady, conversationId, processedMessages.length]);

  React.useEffect(() => {
    if (!__DEV__ || loggedDeferredChromeReadyRef.current) return;
    if (!renderDeferredChrome) return;
    loggedDeferredChromeReadyRef.current = true;
    const tapAt = (globalThis as any).__chatOpenTapAt;
    console.log('[chat-open] deferred chrome ready', {
      conversationId,
      sinceTapMs: typeof tapAt === 'number' ? Math.round((globalThis?.performance?.now?.() ?? Date.now()) - tapAt) : null,
      sinceMountMs: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - mountedAtRef.current),
      chatListReady,
      composerVisible,
      galleryVisible,
      emojiVisible,
      micVisible,
      gifVisible,
      messageMenuVisible,
      reactionSheetVisible,
      reactionsDetailVisible,
      forwardSheetVisible,
      deleteSheetVisible,
      shareContactModalVisible,
      locationModalVisible,
    });
  }, [chatListReady, composerVisible, conversationId, deleteSheetVisible, emojiVisible, forwardSheetVisible, gifVisible, galleryVisible, locationModalVisible, messageMenuVisible, reactionSheetVisible, reactionsDetailVisible, renderDeferredChrome, shareContactModalVisible, micVisible]);

  const getChatItemType = React.useCallback((item: any) => {
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
  }, []);

  const estimateTextMessageHeight = React.useCallback((item: any) => {
    const rawText = (item?.text || item?.content || '').toString();
    if (!rawText) return 96;

    const maxBubbleWidth = windowWidth * 0.75;
    const horizontalChrome = 40;
    const textAreaWidth = Math.max(140, maxBubbleWidth - horizontalChrome);
    const avgCharWidth = 7.2;
    const charsPerLine = Math.max(16, Math.floor(textAreaWidth / avgCharWidth));

    const wrappedLines = rawText
      .split('\n')
      .reduce((total, paragraph) => {
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
  }, [windowWidth]);

  const overrideChatItemLayout = React.useCallback((layout: { size?: number }, item: any) => {
    if (!item) return;

    // prefer measured sizes when available
    try {
      const measured = getMessageSize(item.id);
      if (measured && measured > 0) {
        layout.size = measured;
        return;
      }
    } catch {
      // ignore
    }
    const type = getChatItemType(item);

    // compute accurate sizes for media items when fileInfo dimensions exist
    if ((type === 'image' || type === 'video') && item.fileInfo && item.fileInfo.width && item.fileInfo.height) {
      try {
        const maxWidth = windowWidth * 0.75;
        const maxHeight = windowHeight * 0.48;
        const aspect = item.fileInfo.width / item.fileInfo.height || 1;
        let imgH = maxWidth / aspect;
        if (imgH > maxHeight) {
          imgH = maxHeight;
        }
        // include bubble padding + footer estimate
        layout.size = Math.round(imgH + 12 + 10);
        return;
      } catch {
        // fall through
      }
    }

    if (type === 'image_group' && Array.isArray(item.images) && item.images.length > 0) {
      // estimate grid height using per-image aspect ratios when available
      const count = item.images.length;
      const maxWidth = windowWidth * 0.75;
      const per = count === 2 ? 2 : Math.min(3, count);
      const gap = 6;
      const cellW = Math.floor((maxWidth - gap * (per - 1)) / per);
      const maxCellHeightCap = Math.round(windowHeight * 0.48);
      // compute max cell height among images in a row using fileInfo if present
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
      layout.size = Math.round(totalH + 12 + 10);
      return;
    }

    if (type === 'text') {
      layout.size = estimateTextMessageHeight(item);
      return;
    }

    switch (type) {
      case 'date_separator':
      case 'separator':
        layout.size = 40;
        return;
      case 'sticker':
      case 'audio':
        layout.size = 104;
        return;
      case 'location':
        layout.size = 196;
        return;
      case 'file':
        layout.size = 128;
        return;
      case 'call':
        layout.size = 128;
        return;
      case 'image':
        layout.size = 260;
        return;
      case 'video':
        layout.size = 300;
        return;
      case 'image_group':
        layout.size = 320;
        return;
      default:
        layout.size = 96;
    }
  }, [estimateTextMessageHeight, getChatItemType, windowHeight, windowWidth]);

  const visibleItemsRef = React.useRef<any[]>([]);

  const onViewableItemsChanged = React.useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    visibleItemsRef.current = viewableItems;
    try {
      // throttle prefetching from viewable callback
      const now = Date.now();
      if (!(onViewableItemsChanged as any)._lastPrefetchAt) (onViewableItemsChanged as any)._lastPrefetchAt = 0;
      const last = (onViewableItemsChanged as any)._lastPrefetchAt as number;
      if (now - last < 800) return;
      (onViewableItemsChanged as any)._lastPrefetchAt = now;

      // collect URIs to prefetch
      const toPrefetch: string[] = [];
      for (const v of viewableItems || []) {
        try {
          const item = v.item;
          if (!item) continue;
          if (item.type === 'image' && item.fileInfo) {
            const thumb = item.fileInfo.thumbnailUrl || item.fileInfo.thumbnail || item.fileInfo.thumb || item.fileInfo.url;
            if (thumb) toPrefetch.push(resolveMediaUri(thumb));
          } else if (item.type === 'image_group' && Array.isArray(item.images)) {
            for (const img of item.images.slice(0, 6)) {
              const u = img?.fileInfo?.thumbnailUrl || img?.fileInfo?.thumbnail || img?.fileInfo?.thumb || img?.fileInfo?.url;
              if (u) toPrefetch.push(resolveMediaUri(u));
            }
          }
        } catch {}
      }

      if (toPrefetch.length > 0) {
        import('../../utils/prefetchQueue').then(({ default: prefetchQueue }) => {
          const seen = new Set<string>();
          for (let i = 0; i < toPrefetch.length && i < 4; i++) {
            const uri = toPrefetch[i];
            if (!uri || seen.has(uri)) continue;
            seen.add(uri);
            // enqueue with small stagger
            setTimeout(() => { try { prefetchQueue.enqueue(uri).catch(()=>{}); } catch {} }, i * 150);
          }
        }).catch(() => {});
      }
    } catch {}
  }, []);

  // Pre-warm visible thumbnails after the first interaction frame so the
  // chat shell mounts immediately and image hydration happens in the background.
  React.useEffect(() => {
    if (!processedMessages || processedMessages.length === 0) {
      return;
    }
    if (thumbnailPrefetchRunRef.current === conversationId) {
      return;
    }
    thumbnailPrefetchRunRef.current = conversationId;
    const startedAt = globalThis?.performance?.now?.() ?? Date.now();
    let cancelled = false;

    const cancelSchedule = scheduleLowPriorityTask(() => {
      void (async () => {
        try {
          const toPrefetch: string[] = [];
              for (const item of processedMessages) {
            try {
              if (item.type === 'image' && item.fileInfo) {
                const thumb = item.fileInfo.thumbnailUrl || item.fileInfo.thumbnail || item.fileInfo.thumb || item.fileInfo.url;
                if (thumb) toPrefetch.push(resolveMediaUri(thumb));
              }
            } catch {}
            if (toPrefetch.length >= 4) break;
          }

          if (cancelled || toPrefetch.length === 0) {
            if (__DEV__) {
              console.log('[chat-screen] thumbnail prefetch skipped', {
                conversationId,
                processedMessages: processedMessages.length,
                ms: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - startedAt),
              });
            }
            return;
          }

          if (__DEV__) {
            console.log('[chat-screen] thumbnail prefetch start', {
              conversationId,
              count: toPrefetch.length,
            });
          }

          const [{ getCachedPath }, { default: prefetchQueue }] = await Promise.all([
            import('../../utils/imageCache'),
            import('../../utils/prefetchQueue'),
          ]);

          const diskPromises = toPrefetch.map((u) => getCachedPath(u).catch(() => null));

          for (const u of toPrefetch) {
            try { prefetchQueue.enqueue(u).catch(() => {}); } catch {}
          }

          await Promise.race([
            Promise.all(diskPromises),
            new Promise((res) => setTimeout(res, 80)),
          ]);

          if (__DEV__) {
            console.log('[chat-screen] thumbnail prefetch done', {
              conversationId,
              count: toPrefetch.length,
              ms: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - startedAt),
            });
          }
        } catch {
          // ignore
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [conversationId, processedMessages, scheduleLowPriorityTask]);

  const viewabilityConfig = React.useMemo(() => ({ itemVisiblePercentThreshold: 5, waitForInteraction: false }), []);

  const handleBlankArea = React.useCallback((event: { offsetStart: number; offsetEnd: number; blankArea: number }) => {
    if (event.blankArea <= 0) return;
    if (__DEV__) {
      const visible = (visibleItemsRef.current || []).map((v) => ({ index: v.index, id: v.item?.id, type: getChatItemType(v.item) }));
      console.debug('[FlashList] blank area', event, 'visibleItems:', visible);
    }
  }, [getChatItemType]);

  // Prefill cache with estimated sizes after interactions, and only for a
  // small visible window. This keeps the first paint responsive.
  React.useEffect(() => {
    if (!processedMessages || processedMessages.length === 0) return;
    if (sizePrefillRunRef.current === conversationId) return;
    sizePrefillRunRef.current = conversationId;

    const startedAt = globalThis?.performance?.now?.() ?? Date.now();
    let cancelled = false;

    const cancelSchedule = scheduleLowPriorityTask(() => {
      if (cancelled) return;

      if (__DEV__) {
        console.log('[chat-screen] size prefill start', {
          conversationId,
          processedMessages: processedMessages.length,
        });
      }

      try {
        const prefillItems = processedMessages.slice(0, 24);
        prefillItems.forEach((item: any) => {
          try {
            const type = getChatItemType(item);
            let size = undefined as number | undefined;

            if ((type === 'image' || type === 'video') && item.fileInfo && item.fileInfo.width && item.fileInfo.height) {
              const maxWidth = windowWidth * 0.75;
              const maxHeight = windowHeight * 0.48;
              const aspect = item.fileInfo.width / item.fileInfo.height || 1;
              let imgH = maxWidth / aspect;
              if (imgH > maxHeight) imgH = maxHeight;
              size = Math.round(imgH + 12 + 10);
            } else if (type === 'image_group' && Array.isArray(item.images) && item.images.length > 0) {
              const count = item.images.length;
              const per = count === 2 ? 2 : Math.min(3, count);
              const gap = 6;
              const cellW = Math.floor((windowWidth * 0.75 - gap * (per - 1)) / per);
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
              size = Math.round(totalH + 12 + 10);
            } else {
              switch (type) {
                case 'date_separator':
                case 'separator':
                  size = 40; break;
                case 'sticker':
                case 'audio':
                  size = 104; break;
                case 'location':
                  size = 196; break;
                case 'file':
                  size = 128; break;
                case 'call':
                  size = 128; break;
                case 'image':
                  size = 260; break;
                case 'video':
                  size = 300; break;
                case 'text':
                  size = estimateTextMessageHeight(item); break;
                default:
                  size = 96; break;
              }
            }

            if (size && item.id != null) {
              setMessageSize(item.id, size);
            }
          } catch {
            // ignore per-item
          }
        });
      } catch {
        // ignore
      }

      if (__DEV__) {
        console.log('[chat-screen] size prefill done', {
          conversationId,
          prefilled: Math.min(60, processedMessages.length),
          ms: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - startedAt),
        });
      }
    });

    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [conversationId, estimateTextMessageHeight, processedMessages, windowWidth, windowHeight, getChatItemType, scheduleLowPriorityTask]);

  // Prefetch thumbnails and a few full images to improve perceived load times.
  // Keep the list small to avoid triggering too much work on open.
  React.useEffect(() => {
    let mounted = true;
    const cancel = scheduleLowPriorityTask(() => {
      void (async () => {
        if (!processedMessages || processedMessages.length === 0) return;
        if (mediaPrefetchRunRef.current === conversationId) return;
        mediaPrefetchRunRef.current = conversationId;
        const startedAt = globalThis?.performance?.now?.() ?? Date.now();
        const toPrefetch: string[] = [];

        for (const item of processedMessages) {
          try {
            if (item.type === 'image' && item.fileInfo) {
              const thumb = item.fileInfo.thumbnailUrl || item.fileInfo.thumbnail || item.fileInfo.thumb;
              if (thumb) toPrefetch.push(resolveMediaUri(thumb));
              else if (item.fileInfo.url) toPrefetch.push(resolveMediaUri(item.fileInfo.url));
            }
            if (toPrefetch.length >= 3) break;
          } catch {}
        }

        // enqueue downloads to the shared prefetch queue so they write to disk cache
        const { default: prefetchQueue } = await import('../../utils/prefetchQueue');
        if (__DEV__) {
          console.log('[chat-screen] media prefetch queue start', {
            conversationId,
            count: toPrefetch.length,
          });
        }
        for (let i = 0; i < toPrefetch.length && mounted; i++) {
          const uri = toPrefetch[i];
          // stagger slightly but rely on queue concurrency; slower stagger to reduce spikes
          setTimeout(() => {
            try {
              prefetchQueue.enqueue(uri).catch(() => {});
            } catch {}
          }, i * 220);
        }
        if (__DEV__) {
          console.log('[chat-screen] media prefetch queue scheduled', {
            conversationId,
            count: toPrefetch.length,
            ms: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - startedAt),
          });
        }
      })();
    });
    return () => { mounted = false; cancel(); };
  }, [conversationId, processedMessages, scheduleLowPriorityTask]);

  const micSheetHeight = micVoiceFlowActive
    ? Math.round(sheetHeight + composerHeight)
    : sheetHeight;

  // Only show body loading if we have no messages AND either:
  // 1. Messages are still loading OR
  // 2. It's a 1-1 chat and we're waiting for user status
  const showBodyLoading = (loading || (!isGroup && !!targetUserIdState && targetUserStatus === null)) && processedMessages.length === 0;

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.surface, paddingTop: insets.top }}
      onLayout={() => {
        if (!__DEV__ || loggedFirstLayoutRef.current) return;
        loggedFirstLayoutRef.current = true;
        const tapAt = (globalThis as any).__chatOpenTapAt;
        console.log('[chat-open] first layout', {
          conversationId,
          sinceTapMs: typeof tapAt === 'number' ? Math.round((globalThis?.performance?.now?.() ?? Date.now()) - tapAt) : null,
          sinceMountMs: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - mountedAtRef.current),
        });
      }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1 }} >
          {searchMode ? (
            // header replaced by search header
            <InThreadSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              resultIndices={currentResultIndices}
              currentResultIndex={currentResultIndex}
              onSetCurrentResultIndex={setCurrentResultIndex}
              onClose={() => setSearchMode(false)}
              onScrollToMessage={(idx) => flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5 })}
              renderMode="header"
            />
          ) : (
            <View onTouchStart={maybeCloseAll}>
              <Header
                showBack
              leftElement={
                <TouchableOpacity
                  onPress={() => {
                    const finalTargetUserId = targetUserIdState;
                    if (isGroup) {
                      router.push({
                        pathname: '/chat/[id]/options',
                        params: {
                          id,
                          name: paramName || targetUser?.fullName,
                          avatar: targetUser?.avatar || params.avatar,
                          targetUserId: targetUserId,
                          status: targetUserStatus?.status,
                          isGroup: 'true',
                          membersCount: membersCount,
                          avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars
                        }
                      } as any);
                    } else if (finalTargetUserId) {
                      router.push(`/profile/${finalTargetUserId}`);
                    }
                  }}
                  activeOpacity={1}
                  className="flex-row items-center"
                >
                  {isGroup ? (
                    <GroupAvatar
                      avatars={groupAvatars}
                      size={44}
                      membersCount={membersCount}
                      borderColor={colors.header}
                    />
                  ) : (
                    <ChatAvatar
                      avatar={targetUser?.avatar || (params.avatar as string)}
                      name={paramName || targetUser?.fullName}
                      online={!isGroup && targetUserStatus?.status === 'online'}
                      size={44}
                      tintColor={colors.tint}
                      borderColor={colors.header}
                    />
                  )}
                  <View style={{ marginLeft: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                      {paramName || targetUser?.fullName || 'Chat'}
                    </Text>
                    {isGroup ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>
                        {membersCount} thành viên
                      </Text>
                    ) : statusText && (
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>
                        {statusText}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              }
              onBackPress={() => {
                if ((params as any)?.fromProfile === 'true') {
                  router.replace('/(tabs)');
                } else {
                  router.back();
                }
              }}
              rightActions={isGroup ? [
                { icon: 'video', onPress: handleGroupVideoHeaderPress, active: isActiveGroupCall },
                { icon: 'search', onPress: () => setSearchMode(true) },
                {
                  icon: 'bars',
                  onPress: () => router.push({
                    pathname: '/chat/[id]/options',
                    params: {
                      id,
                      name: paramName || targetUser?.fullName,
                      avatar: targetUser?.avatar || params.avatar,
                      targetUserId: targetUserId,
                      status: targetUserStatus?.status,
                      isGroup: isGroup ? 'true' : 'false',
                      membersCount: membersCount,
                      avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars
                    }
                  } as any)
                },
              ] : [
                { icon: 'call-outline', onPress: startVoiceCall },
                { icon: 'video', onPress: startVideoCall },
                {
                  icon: 'bars',
                  onPress: () => router.push({
                    pathname: '/chat/[id]/options',
                    params: {
                      id,
                      name: paramName || targetUser?.fullName,
                      avatar: targetUser?.avatar || params.avatar,
                      targetUserId: targetUserId,
                      status: targetUserStatus?.status,
                      isGroup: isGroup ? 'true' : 'false',
                      membersCount: membersCount,
                      avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars
                    }
                  } as any)
                },
              ]}
            />
            </View>
          )}

          {showFriendBanner && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceVariant, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 14, flex: 1, marginRight: 8, fontWeight: '500' }}>Chưa kết bạn với người này</Text>
              <TouchableOpacity 
                disabled={sendingRequest || friendshipStatus === 'PENDING_SENT'}
                onPress={handleSendFriendRequest}
                style={{ 
                  backgroundColor: friendshipStatus === 'PENDING_SENT' ? colors.border : '#2563EB', 
                  paddingHorizontal: 16, 
                  paddingVertical: 8, 
                  borderRadius: 20 
                }}
              >
                <Text style={{ color: friendshipStatus === 'PENDING_SENT' ? colors.text : '#fff', fontWeight: '600', fontSize: 13 }}>
                  {sendingRequest ? 'Đang gửi...' : (friendshipStatus === 'PENDING_SENT' ? 'Đã gửi kết bạn' : 'Kết bạn')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {renderDeferredChrome && isGroup && id && (
            <GroupVideoCallModal
              visible={groupVideoCallVisible}
              conversationId={id}
              onClose={() => setGroupVideoCallVisible(false)}
              onStart={(selectedMembers) => {
                startGroupVideoCall(selectedMembers);
              }}
            />
          )}

          {/* Wrapper for messages and composer that pushes up with keyboard */}
            <Animated.View style={[{ flex: 1 }, animatedContentStyle]}>
              {showBodyLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.tint} />
                </View>
              ) : (
                <View
                  style={{ flex: 1, marginBottom: 2 }}
                  onTouchStart={maybeCloseAll}
                >
                  <FlashList
                    initialNumToRender={4}
                    ref={flatListRef}
                    data={processedMessages}
                    inverted
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    keyExtractor={(i, idx) => {
                      // prefer stable id when available, convert to string
                      if (i.id != null && i.id.toString() !== '') {
                        return i.id.toString();
                      }
                      // fallback for messages without an id – include index to
                      // guarantee uniqueness in this render cycle. ideally this
                      // never occurs but it prevents duplicate-key errors when
                      // the backend returns a message with a missing id.
                      return `msg-${idx}`;
                    }}
                    estimatedItemSize={220}
                    estimatedListSize={{ height: windowHeight, width: windowWidth }}
                    getItemType={getChatItemType}
                    overrideItemLayout={overrideChatItemLayout}
                    onLayout={() => {
                      if (!__DEV__ || loggedFlashListLayoutRef.current) return;
                      loggedFlashListLayoutRef.current = true;
                      const tapAt = (globalThis as any).__chatOpenTapAt;
                      console.log('[chat-open] flashlist layout', {
                        conversationId,
                        sinceTapMs: typeof tapAt === 'number' ? Math.round((globalThis?.performance?.now?.() ?? Date.now()) - tapAt) : null,
                        sinceMountMs: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - mountedAtRef.current),
                        processedMessages: processedMessages.length,
                      });
                    }}
                    // Keep the initial draw window smaller so the list does less
                    // work while the first page is still settling.
                    drawDistance={Math.round(windowHeight * 2)}
                    onBlankArea={handleBlankArea}
                    removeClippedSubviews={false}
                    scrollEventThrottle={16}
                    onScroll={(event) => {
                      if (!hasUserScrolledRef.current && event.nativeEvent.contentOffset.y > 24) {
                        hasUserScrolledRef.current = true;
                      }
                    }}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    maintainVisibleContentPosition={{
                      minIndexForVisible: 0,
                      autoscrollToTopThreshold: 10,
                    }}
                    contentContainerStyle={{
                      paddingVertical: 12,
                      paddingBottom: 0
                    }}
                    onEndReached={() => {
                      if (!hasUserScrolledRef.current) return;
                      if (loadingMore || !hasMore) return;

                      const now = Date.now();
                      if (now - lastLoadMoreAtRef.current < 1200) return;
                      lastLoadMoreAtRef.current = now;

                      fetchMessages(true);
                    }}
                    ListEmptyComponent={() => null}
                    ListHeaderComponent={() => isTyping ? (
                      <View className="px-4 py-2 flex-row items-center">
                        <View
                          className="w-10 h-10 rounded-full mr-3 items-center justify-center"
                          style={{ backgroundColor: displayTypingAvatar ? 'transparent' : colors.tint }}
                        >
                          {displayTypingAvatar ? (
                            <Image
                              source={{ uri: displayTypingAvatar }}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                              {typingUserInitials}
                            </Text>
                          )}
                        </View>
                        <View
                          style={{
                            backgroundColor: colors.bubbleOther,
                            borderWidth: 1,
                            borderColor: colors.surfaceVariant,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            borderRadius: 18
                          }}
                        >
                          <TypingDots />
                        </View>
                      </View>
                    ) : null}
                    ListFooterComponent={() => loadingMore ? (
                      <ActivityIndicator style={{ marginVertical: 10 }} color={colors.tint} />
                    ) : null}
                    onEndReachedThreshold={0.15}
                    renderItem={(info) => {
                      if (__DEV__ && !loggedFirstItemRenderRef.current) {
                        loggedFirstItemRenderRef.current = true;
                        const tapAt = (globalThis as any).__chatOpenTapAt;
                        console.log('[chat-open] first item render', {
                          conversationId,
                          sinceTapMs: typeof tapAt === 'number' ? Math.round((globalThis?.performance?.now?.() ?? Date.now()) - tapAt) : null,
                          sinceMountMs: Math.round((globalThis?.performance?.now?.() ?? Date.now()) - mountedAtRef.current),
                          itemType: info?.item?.type ?? null,
                          itemId: info?.item?.id ?? null,
                          index: info?.index ?? null,
                        });
                      }
                      return renderItem(info);
                    }}
                  />
                </View>
              )}

              {/* Bottom search bar: replace composer when in searchMode */}
              {searchMode && (
                <InThreadSearch
                  messages={messages as any}
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  resultIndices={currentResultIndices}
                  currentResultIndex={currentResultIndex}
                  onSetCurrentResultIndex={setCurrentResultIndex}
                  onClose={() => setSearchMode(false)}
                  onScrollToMessage={(idx) => flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5 })}
                  renderMode="bottom"
                />
              )}

              {/* Composer: hidden when search mode is active */}
              {!searchMode && !micVoiceFlowActive && (
                <View
                  onLayout={(event) => {
                    const nextHeight = Math.round(event.nativeEvent.layout.height || 0);
                    if (nextHeight > 0 && Math.abs(nextHeight - composerHeight) > 1) {
                      setComposerHeight(nextHeight);
                    }
                  }}
                >
                  <ChatComposer
                    messageText={messageText}
                    onTextChange={onTextChange}
                    inputRef={inputRef}
                    handleSend={handleSend}
                    onSaveEdit={handleSaveEdit}
                    creatingConversation={creatingConversation}
                    composerVisible={composerVisible}
                    setComposerVisible={setComposerVisible}
                    colors={colors}
                    insets={insets}
                    onOpenSheet={(type) => {
                      if (gifVisible) setGifVisible(false);
                      openSheet(type);
                    }}
                    micTextMode={micTextMode}
                    imageActive={galleryVisible ? 'gallery' : (emojiVisible ? 'emoji' : (micVisible ? 'mic' : (composerVisible ? 'actions' : false)))}
                    attachments={attachments}
                    onRemoveAttachment={removeAttachment}
                    onClearAttachments={clearAttachments}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    onFocus={() => {
                      if (galleryVisible) setGalleryVisible(false);
                      if (composerVisible) setComposerVisible(false);
                      if (emojiVisible) setEmojiVisible(false);
                      if (micVisible) setMicVisible(false);
                      if (gifVisible) setGifVisible(false);
                    }}
                    editingMessage={editingMessage}
                    onCancelEdit={() => {
                      setEditingMessage(null);
                      setMessageText('');
                    }}
                  />
                </View>
              )}
          </Animated.View>

          {renderDeferredChrome && (
            <>
              <GallerySheet
                visible={galleryVisible}
                onClose={() => {
                  setGalleryVisible(false);
                  clearAttachments();
                }}
                attachments={attachments}
                addAttachment={(file: any) => addAttachments([file])}
                removeAttachment={removeAttachment}
                height={sheetHeight}
              />

              <EmojiSheet
                visible={emojiVisible}
                onClose={() => setEmojiVisible(false)}
                onEmojiSelected={(emoji) => {
                  handleEmojiSelect(emoji.emoji);
                }}
                onBackspacePress={handleBackspace}
                height={sheetHeight}
              />

              <ComposerActionsSheet
                visible={composerVisible}
                onClose={() => {
                  setComposerVisible(false);
                }}
                height={sheetHeight}
                loadingAction={isSendingLocation ? 'location' : null}
                onAction={(key) => {
                  if (key === 'document') {
                    closeAll();
                    pickDocument();
                  } else if (key === 'location') {
                    setComposerVisible(false);
                    setLocationModalVisible(true);
                  } else if (key === 'gif') {
                    if (galleryVisible) setGalleryVisible(false);
                    if (emojiVisible) setEmojiVisible(false);
                    if (micVisible) setMicVisible(false);

                    setComposerVisible(false);
                    setGifVisible(true);
                  } else if (key === 'contact') {
                    closeAll();
                    setShareContactModalVisible(true);
                  }
                }}
              />

              <GiphySheet
                visible={gifVisible}
                onClose={() => setGifVisible(false)}
                height={sheetHeight}
                sending={isSendingGif}
                onSelectGif={async (gif) => {
                  await handleSendGif(gif);
                  setGifVisible(false);
                }}
              />

              <ComposerMicSheet
                visible={micVisible}
                onClose={() => {
                  setMicVisible(false);
                }}
                onLockOutsideCloseChange={setMicOutsideCloseLocked}
                onVoiceFlowChange={setMicVoiceFlowActive}
                textMode={micTextMode}
                height={micSheetHeight}
                onSendAudio={async (file) => {
                  await handleSendAttachment(file as any);
                }}
                onTranscriptChange={(text) => {
                  onTextChange(text);
                }}
                onSubmitTranscript={async (text) => {
                  await sendTextDirect(text);
                  setMicVisible(false);
                }}
                onRequestEditTranscript={() => {
                  inputRef.current?.focus?.();
                  // Close mic sheet after requesting focus so keyboard appears immediately.
                  setTimeout(() => {
                    setMicVisible(false);
                  }, 0);
                }}
                onAction={(key) => {
                  if (key === 'send_audio') {
                    // audio mode handled inside ComposerMicSheet
                    setMicTextMode(false);
                  } else if (key === 'send_text') {
                    setMicTextMode(true);
                  }
                }}
              />

              <MessageMenuModal
                visible={messageMenuVisible}
                menuPos={messageMenuPos}
                message={selectedMessage}
                isOutgoing={!!selectedMessage?.fromMe}
                onClose={() => setMessageMenuVisible(false)}
                onAction={(action) => {
                  if (action.startsWith('react_')) {
                    const emoji = action.replace('react_', '');
                    if (emoji === 'more') {
                      setReactionSheetVisible(true);
                    } else {
                      handleReactMessage(selectedMessage, emoji);
                    }
                    setMessageMenuVisible(false);
                    return;
                  }

                  switch (action) {
                    case 'more':
                      setShowMoreMenuActions(true);
                      break;
                    case 'less':
                      setShowMoreMenuActions(false);
                      break;
                    case 'reply':
                      setReplyingTo(selectedMessage);
                      break;
                    case 'copy':
                      Clipboard.setStringAsync(selectedMessage?.text || selectedMessage?.content || '');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      break;
                    case 'edit':
                      setEditingMessage(selectedMessage);
                      setMessageText(selectedMessage?.text || selectedMessage?.content || '');
                      setReplyingTo(null);
                      setMessageMenuVisible(false);
                      setTimeout(() => {
                        inputRef.current?.focus?.();
                      }, 0);
                      break;
                    case 'forward':
                      setForwardSheetVisible(true);
                      setMessageMenuVisible(false);
                      break;
                    case 'delete':
                      setDeleteSheetVisible(true);
                      break;
                    case 'pin':
                      // TODO: implement pin
                      break;
                  }
                }}
                items={!showMoreMenuActions ? [
                  ...(selectedMessage?.fromMe && selectedMessage?.type === 'text' ? [{ key: 'edit', label: 'Chỉnh sửa', icon: 'edit' }] : []),
                  { key: 'reply', label: 'Trả lời', icon: 'arrow-undo', ionicon: true },
                  { key: 'copy', label: 'Sao chép', icon: 'content-copy' },
                  { key: 'more', label: 'Khác', icon: 'more-horiz' },
                ] : [
                  ...(canForwardMessage ? [{ key: 'forward', label: 'Chuyển tiếp', icon: 'arrow-redo', ionicon: true }] : []),
                  { key: 'pin', label: 'Ghim', icon: 'push-pin' },
                  ...(selectedMessage?.fromMe ? [{ key: 'delete', label: 'Thu hồi', icon: 'delete', destructive: true }] : []),
                  { key: 'less', label: 'Khác', icon: 'more-horiz' },
                ]}
              >
                {selectedMessage && (
                  <MessageBubble
                    message={selectedMessage}
                    isLastInGroup={true}
                    isThreadLast={false}
                    contactAvatarFallback={!isGroup ? (targetUser?.avatar || (params.avatar as string | undefined)) : undefined}
                    isGroupThread={isGroup}
                    // Pass dummy props to avoid interactions
                    onPress={() => {}}
                    onLongPress={() => {}}
                    simple={true}
                  />
                )}
              </MessageMenuModal>

              <LocationPreviewModal
                visible={locationModalVisible}
                onClose={() => setLocationModalVisible(false)}
                onConfirm={(lat, lng) => {
                  setLocationModalVisible(false);
                  handleSendLocationData(lat, lng);
                }}
              />

              <ForwardMessageSheet
                visible={forwardSheetVisible}
                currentConversationId={conversationId}
                onClose={() => setForwardSheetVisible(false)}
                message={selectedMessage}
                onForward={async (conversationIds) => {
                  if (!selectedMessage || !selectedMessage.id) return;

                  const sourceConversationId =
                    selectedMessage.conversationId ?? conversationId;

                  if (!sourceConversationId) return;

                  try {
                    await chatApi.forwardMessage(
                      sourceConversationId,
                      selectedMessage.id,
                      conversationIds,
                    );
                  } catch (error) {
                    console.error('Forward message failed', {
                      sourceConversationId,
                      messageId: selectedMessage.id,
                      conversationIds,
                      error,
                    });
                  }
                }}
              />

              <DeleteMessageSheet
                visible={deleteSheetVisible}
                onClose={() => setDeleteSheetVisible(false)}
                onDeleteForMe={() => {
                  if (selectedMessage) {
                    deleteMessage(selectedMessage.id, 'deleteForMe');
                  }
                }}
                onUnsend={() => {
                  if (selectedMessage) {
                    deleteMessage(selectedMessage.id, 'unsend');
                  }
                }}
              />

              <ShareContactModal
                visible={shareContactModalVisible}
                onClose={() => setShareContactModalVisible(false)}
                conversationId={id}
              />

              <ReactionSheet
                visible={reactionSheetVisible}
                onClose={() => setReactionSheetVisible(false)}
                onReact={(emoji) => {
                  if (selectedMessage) {
                    handleReactMessage(selectedMessage, emoji);
                  }
                }}
                message={selectedMessage}
                userId={user?.id}
              />

              <ReactionsDetailSheet
                visible={reactionsDetailVisible}
                onClose={() => setReactionsDetailVisible(false)}
                message={selectedMessage}
                userId={user?.id}
                onRemoveReaction={(emoji) => {
                  if (selectedMessage) {
                    handleReactMessage(selectedMessage, emoji);
                  }
                }}
              />
            </>
          )}

        </View>
      </View>
    </View>
  );
}
