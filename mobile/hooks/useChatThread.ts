import { useMemo } from 'react';
import { useTheme } from '@/context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@/context/authContext';
import { useTyping } from './useTyping';
import { useCall } from '@/context/callContext';
import { useChatThreadCalls } from './useChatThread/useChatThreadCalls';
import { useChatThreadAttachments } from './useChatThread/useChatThreadAttachments';
import { useChatThreadComposer } from './useChatThread/useChatThreadComposer';
import { useChatThreadMessageNavigation } from './useChatThread/useChatThreadMessageNavigation';
import { useChatThreadMeta } from './useChatThread/useChatThreadMeta';
import { useChatThreadRefs } from './useChatThread/useChatThreadRefs';
import { useChatThreadSheetAnimation } from './useChatThread/useChatThreadSheetAnimation';
import { useChatThreadSendText } from './useChatThread/useChatThreadSendText';
import { useChatThreadState } from './useChatThread/useChatThreadState';
import { useChatThreadSearch } from './useChatThread/useChatThreadSearch';
import { useChatThreadRuntime } from './useChatThread/useChatThreadRuntime';
import { buildProcessedMessages } from '@/utils/chatThread';

export function useChatThread() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (params.id as string) === 'new' ? null : (params.id as string);
  const targetUserId = params.targetUserId as string;
  const paramName = params.name as string | undefined;
  const isNewConversation = (!id || id === 'new') && !!targetUserId;

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
  });

  const { isTyping, typingUser, handleType } = useTyping(conversationId, user?.id);
  const isFocused = useIsFocused();
  const isGroup = params.isGroup === 'true';

  const { messagesRef, allMediaRef, flatListRef, inputRef } =
    useChatThreadRefs({ messages, allMedia });

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
  const { startVoiceCall, startVideoCall } = useChatThreadCalls({
    isGroupParam: params.isGroup as string | undefined,
    targetUserIdState,
    conversationId,
    paramName,
    targetUser,
    paramAvatar: params.avatar as string | undefined,
    startCall,
  });

  const processedMessages = useMemo(
    () => buildProcessedMessages(messages),
    [messages],
  );

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

  const { handleSend, sendTextDirect } = useChatThreadSendText({
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
  };
}
