import React from 'react';
import { getMessageSize } from '@/utils/messageSizeCache';
import AntDesign from '@expo/vector-icons/AntDesign';
import { View, ActivityIndicator, Image, TouchableOpacity, Text, BackHandler, Platform, useWindowDimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { GallerySheet, EmojiSheet, GiphySheet, TypingDots, InThreadSearch, MessageBubble, ComposerActionsSheet, ComposerMicSheet, ChatComposer, GroupVideoCallModal, MessageMenuModal, DeleteMessageSheet, LocationPreviewModal, ForwardMessageSheet, ShareContactModal, ReactionSheet, ReactionsDetailSheet } from '@/components';
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
import { getChatItemType, computeChatItemSize } from '@/utils/chatThread';
import prefetchQueue from '@/utils/prefetchQueue';
import { getCachedPath } from '@/utils/imageCache';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { getDefaultAvatarUrl } from '@/utils/avatar';
import useRenderChatItem from '@/hooks/useRenderChatItem';
import useViewability from '@/hooks/useViewability';
import useMediaPrefetch from '@/hooks/useMediaPrefetch';
import useChatItemLayout from '@/hooks/useChatItemLayout';
import ChatHeader from './ChatHeader';



export default function ChatThread() {
  const DEFAULT_COMPOSER_HEIGHT = 74;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  
  // mountedAtRef intentionally removed (timing/logging removed)
  const loggedFirstLayoutRef = React.useRef(false);
  const loggedChatListReadyRef = React.useRef(false);
  const loggedDeferredChromeReadyRef = React.useRef(false);
  const loggedFlashListLayoutRef = React.useRef(false);
  const loggedFirstItemRenderRef = React.useRef(false);
  const richChromeReadyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailPrefetchRunRef = React.useRef<string | null>(null);
  const mediaPrefetchRunRef = React.useRef<string | null>(null);
  const prefetchTimeoutsRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);
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
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  

  const [forwardSheetVisible, setForwardSheetVisible] = React.useState(false);
  
  const { user } = useAuth();
  const [reactionSheetVisible, setReactionSheetVisible] = React.useState(false);
  const [reactionsDetailVisible, setReactionsDetailVisible] = React.useState(false);

  const [gifVisible, setGifVisible] = React.useState(false);
  const [, setRichMessageChromeReady] = React.useState(false);
  const [chatListReady, setChatListReady] = React.useState(false);
  const visibleMessageIdSetRef = React.useRef<Set<string>>(new Set());
  const [backgroundMediaWarmupEnabled, setBackgroundMediaWarmupEnabled] = React.useState(false);

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
    groupDetails,
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
    setRichMessageChromeReady(false);
    setChatListReady(false);

    if (richChromeReadyTimerRef.current) {
      clearTimeout(richChromeReadyTimerRef.current);
      richChromeReadyTimerRef.current = null;
    }

    const requestFrame = (globalThis as any).requestAnimationFrame;
    const cancelFrame = (globalThis as any).cancelAnimationFrame;

    const frameId =
      typeof requestFrame === 'function'
        ? requestFrame(() => {
            setChatListReady(true);
            richChromeReadyTimerRef.current = setTimeout(() => {
              setRichMessageChromeReady(true);
              richChromeReadyTimerRef.current = null;
            }, 240);
          })
        : setTimeout(() => {
            setChatListReady(true);
            richChromeReadyTimerRef.current = setTimeout(() => {
              setRichMessageChromeReady(true);
              richChromeReadyTimerRef.current = null;
            }, 240);
          }, 0);

    return () => {
      if (richChromeReadyTimerRef.current) {
        clearTimeout(richChromeReadyTimerRef.current);
        richChromeReadyTimerRef.current = null;
      }
      if (typeof cancelFrame === 'function' && typeof frameId === 'number') {
        cancelFrame(frameId);
      } else {
        clearTimeout(frameId as ReturnType<typeof setTimeout>);
      }
    };
  }, [conversationId]);

  

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

  const renderItem = useRenderChatItem({
    processedMessages,
    colors,
    searchQuery,
    composerVisible,
    closeAll,
    gifVisible,
    setGifVisible,
    router,
    highlightedMessageId,
    uploadProgress,
    setReplyingTo,
    scrollToMessageId,
    allMedia,
    startVoiceCall,
    startVideoCall,
    handleCallAction,
    isGroup,
    targetUser,
    paramsObj: params,
    paramName,
    handleRetryMessage,
    setSelectedMessage,
    setMessageMenuPos,
    setShowMoreMenuActions,
    setMessageMenuVisible,
    setReactionSheetVisible,
    setReactionsDetailVisible,
    user,
    groupDetails,
  });

  const { onViewableItemsChanged } = useViewability({
    backgroundMediaWarmupEnabled,
    prefetchQueue,
    resolveMediaUri,
    visibleMessageIdSetRef,
  });

  useMediaPrefetch({
    backgroundMediaWarmupEnabled,
    processedMessages,
    conversationId,
    thumbnailPrefetchRunRef,
    mediaPrefetchRunRef,
    scheduleLowPriorityTask,
    getCachedPath,
    prefetchQueue,
    resolveMediaUri,
    prefetchTimeoutsRef,
  });

  const overrideChatItemLayout = useChatItemLayout({
    getMessageSize,
    getChatItemType,
    computeChatItemSize,
    windowWidth,
    windowHeight,
  });

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
    // log removed
  }, [chatListReady, conversationId, processedMessages.length]);

  React.useEffect(() => {
    if (!__DEV__ || loggedDeferredChromeReadyRef.current) return;
    if (!renderDeferredChrome) return;
    loggedDeferredChromeReadyRef.current = true;
    // log removed
  }, [chatListReady, composerVisible, conversationId, deleteSheetVisible, emojiVisible, forwardSheetVisible, gifVisible, galleryVisible, locationModalVisible, messageMenuVisible, reactionSheetVisible, reactionsDetailVisible, renderDeferredChrome, shareContactModalVisible, micVisible]);

  

  const viewabilityConfig = React.useMemo(() => ({ itemVisiblePercentThreshold: 5, waitForInteraction: false }), []);

  // Debug: log processedMessages duplicate IDs and blank area events
  const processedMessagesJsonRef = React.useRef('');
  React.useEffect(() => {
    if (!__DEV__ || !processedMessages.length) return;
    // Check for duplicate keys
    const keys = new Set<string>();
    const dupes: string[] = [];
    for (const msg of processedMessages) {
      const k = msg.id != null ? msg.id.toString() : '';
      if (k && keys.has(k)) dupes.push(k);
      keys.add(k);
    }
    if (dupes.length > 0) {
      console.warn(`[ChatThread] 🔴 Duplicate processedMessages IDs:`, dupes);
    }

    const json = processedMessages.map(m => `${m.type}:${m.id}`).join(',');
    if (json !== processedMessagesJsonRef.current) {
      // log removed
      processedMessagesJsonRef.current = json;
    }
  }, [processedMessages]);

  const handleBlankArea = React.useCallback(() => {}, []);

  // Debug: log size cache state for first few items

  // Prefetch thumbnails and a few full images to improve perceived load times.
  // Keep the list small to avoid triggering too much work on open.
  React.useEffect(() => {
    if (!backgroundMediaWarmupEnabled) return;
    let mounted = true;
    const cancel = scheduleLowPriorityTask(() => {
      void (async () => {
        if (!processedMessages || processedMessages.length === 0) return;
        if (mediaPrefetchRunRef.current === conversationId) return;
        mediaPrefetchRunRef.current = conversationId;
        // timing removed
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

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        for (let i = 0; i < toPrefetch.length && mounted; i++) {
          const uri = toPrefetch[i];
          const id = setTimeout(() => {
            try {
              if (mounted) prefetchQueue.enqueue(uri).catch(() => {});
            } catch {}
          }, i * 220);
          timeouts.push(id);
        }
        prefetchTimeoutsRef.current = timeouts;
        // log removed
      })();
    });
    return () => {
      mounted = false;
      cancel();
      prefetchTimeoutsRef.current.forEach(clearTimeout);
      prefetchTimeoutsRef.current = [];
    };
  }, [backgroundMediaWarmupEnabled, conversationId, processedMessages, scheduleLowPriorityTask]);

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
        // log removed
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
              <ChatHeader
              maybeCloseAll={maybeCloseAll}
              isGroup={isGroup}
              router={router}
              paramName={paramName}
              targetUser={targetUser}
              params={params}
              targetUserIdState={targetUserIdState}
              membersCount={membersCount}
              groupAvatars={groupAvatars}
              colors={colors}
              targetUserStatus={targetUserStatus}
              statusText={statusText}
              handleGroupVideoHeaderPress={handleGroupVideoHeaderPress}
              isActiveGroupCall={isActiveGroupCall}
              setSearchMode={setSearchMode}
              id={id}
              targetUserId={targetUserId}
              startVoiceCall={startVoiceCall}
              startVideoCall={startVideoCall}
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
                    extraData={{ groupDetails, targetUser, colors, searchQuery, highlightedMessageId }}
                    initialNumToRender={8}
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
                    estimatedItemSize={300}
                    estimatedListSize={{ height: windowHeight, width: windowWidth }}
                    getItemType={getChatItemType}
                    overrideItemLayout={overrideChatItemLayout}
                    onLayout={() => {
                      if (!__DEV__ || loggedFlashListLayoutRef.current) return;
                      loggedFlashListLayoutRef.current = true;
                      // log removed
                    }}
                    drawDistance={Math.round(windowHeight * 10)}
                    onBlankArea={handleBlankArea}
                    removeClippedSubviews={false}
                    scrollEventThrottle={16}
                    onScroll={(event) => {
                      const offsetY = event.nativeEvent.contentOffset.y;
                      setIsAtBottom(offsetY <= 50);
                      if (!hasUserScrolledRef.current && offsetY > 24) {
                        hasUserScrolledRef.current = true;
                        if (!backgroundMediaWarmupEnabled) {
                          setBackgroundMediaWarmupEnabled(true);
                        }
                      }
                    }}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
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
                            <Image source={{ uri: getDefaultAvatarUrl() }} style={{ width: 40, height: 40, borderRadius: 20 }} />
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
                        // log removed
                      }
                      return renderItem(info);
                    }}
                  />
                  {!isAtBottom && (
                    <Animated.View entering={SlideInDown} exiting={SlideOutDown.duration(120)} style={{ position: 'absolute', bottom: 24, alignSelf: 'center' }}>
                      <TouchableOpacity
                        onPress={() => {
                          flatListRef.current?.scrollToIndex({ index: 0, animated: true, viewPosition: 1 });
                          setIsAtBottom(true);
                        }}
                        activeOpacity={0.7}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: colors.surface,
                          justifyContent: 'center',
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 5,
                        }}
                      >
                        <AntDesign name="arrow-down" size={22} color={colors.text} />
                      </TouchableOpacity>
                    </Animated.View>
                  )}
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
                    currentUserName={user?.fullName}
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
                    senderName={selectedMessage.sender?.fullName || selectedMessage.contactName}
                    contactAvatarFallback={!isGroup ? (targetUser?.avatar || (params.avatar as string | undefined)) : undefined}
                    isGroupThread={isGroup}
                    // Pass dummy props to avoid interactions
                    onPress={() => {}}
                    onLongPress={() => {}}
                    simple={true}
                    inModal={true}
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
