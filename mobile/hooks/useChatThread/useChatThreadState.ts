import { useState } from 'react';

interface UseChatThreadStateParams {
  id: string | null;
  targetUserId: string | null;
  paramsTargetUserId: string | null;
  isNewConversation: boolean;
}

export function useChatThreadState({
  id,
  targetUserId,
  paramsTargetUserId,
  isNewConversation,
}: UseChatThreadStateParams) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNewConversation);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(id || null);
  const [targetUserIdState, setTargetUserIdState] = useState<string | null>(
    targetUserId || paramsTargetUserId || null,
  );
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const [targetUserStatus, setTargetUserStatus] = useState<{
    status: string;
    lastSeen: number | null;
  } | null>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);

  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [allMedia, setAllMedia] = useState<any[]>([]);
  const [loadingMoreMedia, setLoadingMoreMedia] = useState(false);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );

  return {
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
  };
}
