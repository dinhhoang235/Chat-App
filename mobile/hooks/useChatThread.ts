import { useMemo, useCallback, useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useTheme } from "@/context/themeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useAuth } from "@/context/authContext";
import { useTyping } from "./useTyping";
import { useCall } from "@/context/callContext";
import { useChatThreadCalls } from "./useChatThread/useChatThreadCalls";
import { useChatThreadAttachments } from "./useChatThread/useChatThreadAttachments";
import { useChatThreadComposer } from "./useChatThread/useChatThreadComposer";
import { useChatThreadMessageNavigation } from "./useChatThread/useChatThreadMessageNavigation";
import { useChatThreadMeta } from "./useChatThread/useChatThreadMeta";
import { useChatThreadRefs } from "./useChatThread/useChatThreadRefs";
import { useChatThreadSheetAnimation } from "./useChatThread/useChatThreadSheetAnimation";
import { useChatThreadSendText } from "./useChatThread/useChatThreadSendText";
import { useChatThreadState } from "./useChatThread/useChatThreadState";
import { useChatThreadSearch } from "./useChatThread/useChatThreadSearch";
import { useChatThreadRuntime } from "./useChatThread/useChatThreadRuntime";
import { useChatThreadGroupCall } from "./useChatThread/useChatThreadGroupCall";
import { useChatThreadLocation } from "./useChatThread/useChatThreadLocation";
import { useChatThreadGif } from "./useChatThread/useChatThreadGif";
import { buildProcessedMessages, mapThreadMessage, computeChatItemSize } from "@/utils/chatThread";
import { getMessageSize, setMessageSize } from "@/utils/messageSizeCache";
import { chatThreadCache } from "@/utils/chatThreadCache";
import { chatApi } from "@/services/chat";
import { error } from "@/utils/logger";

type UseChatThreadOptions = {
  openGroupVideoCallModal?: () => void;
  gifVisible?: boolean;
};

export function useChatThread(options?: UseChatThreadOptions) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (params.id as string) === "new" ? null : (params.id as string);
  const targetUserId = params.targetUserId as string;
  const paramName = params.name as string | undefined;
  const paramStatus = params.status as string | undefined;
  const paramLastSeen = params.lastSeen as string | undefined;
  const initialMessages = useMemo(() => {
    // timing removed
    if (id && chatThreadCache.hasMessages(id)) {
      const cachedMessages = chatThreadCache
        .getMessages(id)
        .map((message: any) =>
          mapThreadMessage(message, user?.id, { includeSeenBy: true }),
        );
      // log removed
      return cachedMessages;
    }

    const raw = params.initialMessages as string | undefined;
    if (!raw) {
      // log removed
      return [] as any[];
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      if (!Array.isArray(parsed)) {
        // log removed
        return [] as any[];
      }

      const mapped = parsed.map((message: any) =>
        mapThreadMessage(message, user?.id, { includeSeenBy: true }),
      );
      // log removed
      return mapped;
    } catch (error) {
      // log removed
      return [] as any[];
    }
  }, [id, params.initialMessages, user?.id]);
  const isNewConversation = (!id || id === "new") && !!targetUserId;

  const {
    messages,
    setMessages,
    loading,
    setLoading,
    loadingMore,
    setLoadingMore,
    hasMore,
    setHasMore,
    conversationId,
    setConversationId,
    targetUserIdState,
    setTargetUserIdState,
    creatingConversation,
    setCreatingConversation,
    initialFetchDone,
    setInitialFetchDone,
    targetUserStatus,
    setTargetUserStatus,
    targetUser,
    setTargetUser,
    replyingTo,
    setReplyingTo,
    groupDetails,
    setGroupDetails,
    allMedia,
    setAllMedia,
    loadingMoreMedia,
    setLoadingMoreMedia,
    hasMoreMedia,
    setHasMoreMedia,
    uploadProgress,
    setUploadProgress,
  } = useChatThreadState({
    id,
    targetUserId,
    paramsTargetUserId: params.targetUserId as string | null,
    isNewConversation,
    initialMessages,
    initialTargetUserStatus: paramStatus
      ? {
          status: paramStatus,
          lastSeen:
            paramStatus === "online" || !paramLastSeen
              ? null
              : Number(paramLastSeen),
        }
      : null,
  });

  const { isTyping, typingUser, handleType } = useTyping(
    conversationId,
    user?.id,
  );
  const isFocused = useIsFocused();
  const isGroup = params.isGroup === "true";

  const { messagesRef, allMediaRef, flatListRef, inputRef } = useChatThreadRefs(
    { messages, allMedia },
  );

  const {
    fetchMessages: runtimeFetchMessages,
    fetchAllMedia: runtimeFetchAllMedia,
  } = useChatThreadRuntime({
    id,
    params,
    userId: user?.id,
    isNewConversation,
    initialFetchDone,
    conversationId,
    targetUserIdState,
    isGroup,
    isFocused,
    messages,
    setMessages,
    loading,
    setLoading,
    loadingMore,
    setLoadingMore,
    hasMore,
    setHasMore,
    setConversationId,
    setInitialFetchDone,
    setTargetUserIdState,
    setTargetUserStatus,
    setTargetUser,
    targetUser,
    messagesRef,
    allMediaRef,
    allMedia,
    setAllMedia,
    loadingMoreMedia,
    setLoadingMoreMedia,
    hasMoreMedia,
    setHasMoreMedia,
    groupDetails,
    setGroupDetails,
    flatListRef,
  });

  const fetchMessages = runtimeFetchMessages;
  const fetchAllMedia = runtimeFetchAllMedia;

  const { displayTypingAvatar, groupAvatars, membersCount, statusText } =
    useChatThreadMeta({
      typingUser,
      groupDetails,
      paramsAvatars: params.avatars,
      paramAvatar: params.avatar,
      paramsMembersCount: params.membersCount,
      isGroup,
      targetUserStatus,
    });

  const { startCall } = useCall();
  const {
    startVoiceCall,
    startVideoCall,
    startVideoCallToTarget,
    startGroupVideoCall,
  } = useChatThreadCalls({
    isGroupParam: params.isGroup as string | undefined,
    targetUserIdState,
    conversationId,
    paramName,
    targetUser,
    paramAvatar: params.avatar as string | undefined,
    startCall,
  });
  const { handleGroupVideoHeaderPress } = useChatThreadGroupCall({
    conversationId: id,
    openGroupVideoCallModal: options?.openGroupVideoCallModal ?? (() => {}),
  });

  const processedMessages = useMemo(() => {
    const processed = buildProcessedMessages(messages, user?.id);
    // Prefill size cache synchronously — runs before FlashList renders
    for (const item of processed) {
      if (item.id == null) continue;
      if (getMessageSize(item.id)) continue;
      const size = computeChatItemSize(item, windowWidth, windowHeight);
      setMessageSize(item.id, size);
      if (__DEV__) {
        // log removed
      }
    }
    return processed;
  }, [id, messages, user?.id, windowWidth, windowHeight]);

  useEffect(() => {
    // log removed
  }, [
    conversationId,
    id,
    messages.length,
    processedMessages.length,
    loading,
    loadingMore,
    initialFetchDone,
    isFocused,
    isGroup,
    hasMore,
  ]);

  const { highlightedMessageId, scrollToMessageId } =
    useChatThreadMessageNavigation({
      processedMessages,
      flatListRef,
    });

  const {
    searchMode,
    setSearchMode,
    searchQuery,
    setSearchQuery,
    resultIndices,
    currentResultIndex,
    setCurrentResultIndex,
    searchResults,
    currentResultIndices,
  } = useChatThreadSearch({
    conversationId,
    processedMessages,
    isFocused,
    chatId: params.id as string | undefined,
    initialSearch: !!(params as any).search,
  });

  const {
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
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    onTextChange,
    handleEmojiSelect,
    handleBackspace,
  } = useChatThreadComposer({ handleType });

  const { insets, lastKeyboardHeight, animatedContentStyle } =
    useChatThreadSheetAnimation({
      composerVisible,
      galleryVisible,
      emojiVisible,
      micVisible,
      gifVisible: options?.gifVisible,
      inputRef,
    });

  const { handleSendAttachment, pickDocument } = useChatThreadAttachments({
    userId: user?.id,
    conversationId,
    isNewConversation,
    targetUserIdState,
    replyingTo,
    setReplyingTo,
    setMessages,
    setConversationId,
    setCreatingConversation,
    setUploadProgress,
  });

  const { handleSend, sendTextDirect, handleRetryMessage } =
    useChatThreadSendText({
      attachments,
      clearAttachments,
      setGalleryVisible,
      messageText,
      setMessageText,
      handleSendAttachment,
      flatListRef,
      replyingTo,
      setReplyingTo,
      userId: user?.id,
      conversationId,
      isNewConversation,
      targetUserIdState,
      setMessages,
      setCreatingConversation,
      setConversationId,
    });

  const deleteMessage = useCallback(
    async (messageId: number, mode: "unsend" | "deleteForMe") => {
      if (!conversationId) return;
      try {
        await chatApi.deleteMessage(conversationId, messageId, mode);
        if (mode === "deleteForMe") {
          // Hide locally immediately and update in-memory cache
          setMessages((prev) => {
            const next = prev.filter((m) => m.id !== messageId);
            // Sync chatThreadCache so message doesn't flash back on re-entry
            chatThreadCache.setMessages(conversationId, next);
            return next;
          });
        }
        // For 'unsend', the socket event (message_revoked) handles the UI update
        // and also persists the updated cache via the socket handler.
      } catch (err) {
        error("Delete message error:", err);
        throw err;
      }
    },
    [conversationId, setMessages],
  );

  const { handleSendLocation, handleSendLocationData, isSendingLocation } =
    useChatThreadLocation({
      flatListRef,
      replyingTo,
      setReplyingTo,
      userId: user?.id,
      conversationId,
      isNewConversation,
      targetUserIdState,
      setMessages,
      setCreatingConversation,
      setConversationId,
    });

  const { handleSendGif, isSendingGif } = useChatThreadGif({
    flatListRef,
    replyingTo,
    setReplyingTo,
    userId: user?.id,
    conversationId,
    isNewConversation,
    targetUserIdState,
    setMessages,
    setCreatingConversation,
    setConversationId,
  });

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
    setMessageText,
    setMessages,
    onTextChange,
    handleEmojiSelect,
    handleBackspace,
    insets,
    animatedContentStyle,
    fetchMessages,
    handleSend,
    handleSendLocation,
    handleSendLocationData,
    isSendingLocation,
    handleSendGif,
    isSendingGif,
    handleRetryMessage,
    sendTextDirect,
    handleSendAttachment,
    pickDocument,
    statusText,
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    targetUser,
    targetUserStatus,
    isGroup,
    groupAvatars,
    groupDetails,
    membersCount,
    allMedia,
    fetchAllMedia,
    loadingMoreMedia,
    hasMoreMedia,
    replyingTo,
    setReplyingTo,
    highlightedMessageId,
    scrollToMessageId,
    uploadProgress,
    startVoiceCall,
    startVideoCall,
    startVideoCallToTarget,
    startGroupVideoCall,
    handleGroupVideoHeaderPress,
    deleteMessage,
  };
}
