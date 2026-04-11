import { useCallback, useEffect } from 'react';
import { setActiveConversationId, activeConversationId } from '@/services/notificationState';
import { chatApi } from '@/services/chat';
import { userAPI } from '@/services/user';
import { socketService } from '@/services/socket';
import { dedupeById, mapThreadMedia, mapThreadMessage } from '@/utils/chatThread';

type RuntimeArgs = {
  id: string | null;
  params: any;
  userId?: number;
  isNewConversation: boolean;
  initialFetchDone: boolean;
  conversationId: string | null;
  targetUserIdState: string | null;
  isGroup: boolean;
  isFocused: boolean;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadingMore: boolean;
  setLoadingMore: React.Dispatch<React.SetStateAction<boolean>>;
  hasMore: boolean;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setInitialFetchDone: React.Dispatch<React.SetStateAction<boolean>>;
  setTargetUserIdState: React.Dispatch<React.SetStateAction<string | null>>;
  setTargetUserStatus: React.Dispatch<React.SetStateAction<{ status: string; lastSeen: number | null } | null>>;
  setTargetUser: React.Dispatch<React.SetStateAction<any>>;
  targetUser: any;
  messagesRef: React.MutableRefObject<any[]>;
  allMediaRef: React.MutableRefObject<any[]>;
  allMedia: any[];
  setAllMedia: React.Dispatch<React.SetStateAction<any[]>>;
  loadingMoreMedia: boolean;
  setLoadingMoreMedia: React.Dispatch<React.SetStateAction<boolean>>;
  hasMoreMedia: boolean;
  setHasMoreMedia: React.Dispatch<React.SetStateAction<boolean>>;
  groupDetails: any;
  setGroupDetails: React.Dispatch<React.SetStateAction<any>>;
  flatListRef: React.RefObject<any>;
};

export function useChatThreadRuntime({
  id,
  params,
  userId,
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
}: RuntimeArgs) {
  useEffect(() => {
    allMediaRef.current = allMedia;
  }, [allMedia, allMediaRef]);

  useEffect(() => {
    const checkExisting = async () => {
      if (isNewConversation && targetUserIdState && !conversationId) {
        try {
          const response = await chatApi.startConversation(Number(targetUserIdState));
          const conv = response.data;
          const convId = conv.id || conv.conversationId;
          if (convId && conv.messages && conv.messages.length > 0) {
            setConversationId(convId.toString());
          }
        } catch {
          console.log("No existing conversation found yet, sticking with 'new' mode");
        }
      }
    };
    checkExisting();
  }, [isNewConversation, targetUserIdState, conversationId, setConversationId]);

  const fetchAllMedia = useCallback(async (isLoadMore = false) => {
    if (!id || id === 'new') return;
    if (isLoadMore && (!hasMoreMedia || loadingMoreMedia)) return;

    try {
      if (isLoadMore) setLoadingMoreMedia(true);

      const cursor =
        isLoadMore && allMediaRef.current.length > 0
          ? allMediaRef.current[allMediaRef.current.length - 1].id
          : undefined;

      const response = await chatApi.getConversationMedia(id, cursor, 30);
      const newMedia = response.data;
      const mapped = mapThreadMedia(newMedia, userId);

      if (isLoadMore) {
        setAllMedia(prev => dedupeById([...prev, ...mapped]));
      } else {
        setAllMedia(dedupeById(mapped));
      }

      setHasMoreMedia(newMedia.length >= 30);
    } catch (error) {
      console.error('Fetch all media error:', error);
    } finally {
      if (isLoadMore) setLoadingMoreMedia(false);
    }
  }, [id, userId, hasMoreMedia, loadingMoreMedia, allMediaRef, setAllMedia, setHasMoreMedia, setLoadingMoreMedia]);

  const fetchGroupDetails = useCallback(async () => {
    if (!id || params.isGroup !== 'true') return;
    try {
      const response = await chatApi.getConversationDetails(id);
      setGroupDetails(response.data);
    } catch (error) {
      console.error('Fetch group details error:', error);
    }
  }, [id, params.isGroup, setGroupDetails]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

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
  }, [targetUserIdState, setTargetUserStatus, setTargetUser]);

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
  }, [isFocused, targetUserIdState, setTargetUserStatus]);

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
      const mapped = newMessages.map((m: any) => mapThreadMessage(m, userId, { includeSeenBy: true }));

      if (isLoadMore) {
        setMessages(prev => dedupeById([...prev, ...mapped]));
      } else {
        setMessages(dedupeById(mapped));
        setInitialFetchDone(true);
      }

      setHasMore(newMessages.length >= 20);

      if (!targetUserIdState && mapped.length > 0) {
        const otherMessage = mapped.find((m: any) => m.senderId !== userId);
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
  }, [conversationId, userId, hasMore, loadingMore, targetUserIdState, messagesRef, setHasMore, setInitialFetchDone, setLoading, setLoadingMore, setMessages, setTargetUserIdState]);

  useEffect(() => {
    setInitialFetchDone(false);
    setHasMore(true);
    setMessages([]);
    if (conversationId) {
      setLoading(true);
      fetchMessages(false);
    }
    // Keep this bound to conversation changes only, same behavior as pre-refactor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!isFocused || !conversationId) return;
    if (initialFetchDone) return;
    const conversationIdNum = parseInt(conversationId, 10);

    fetchMessages(false);
    fetchAllMedia();
    socketService.emit('join_conversation', conversationIdNum);

    chatApi.markAsRead(conversationIdNum).catch(err => {
      console.error('Mark as read focus error:', err);
    });
    // Avoid re-running on callback identity churn while preserving original focus behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isFocused, initialFetchDone]);

  useEffect(() => {
    if (!isFocused) return;

    const conversationIdNum = conversationId ? parseInt(conversationId, 10) : null;

    const handleMessageSeen = (data: any) => {
      const { userId: seenByUserId, seenAt, user: seenUser } = data;
      if (seenByUserId === userId) return;

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

    const handleNewMessage = (message: any) => {
      if (isFocused && conversationId && message.conversationId === parseInt(conversationId, 10)) {
        if (message.senderId !== userId) {
          chatApi.markAsRead(message.conversationId).catch(err => {
            console.error('Mark as read new message error:', err);
          });
        }
      }

      setMessages(prev => {
        const isDuplicate = prev.find(m => m.id?.toString() === message.id?.toString());
        if (isDuplicate) return prev;

        let incomingFileName: string | undefined;
        if (message.type === 'file' || message.type === 'image' || message.type === 'video' || message.type === 'audio') {
          try {
            const info = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
            incomingFileName = info?.name;
          } catch {
            if (message.type === 'image' || message.type === 'video' || message.type === 'audio') {
              incomingFileName = undefined;
            }
          }
        }

        let tempIdx = -1;
        if (message.tempId) {
          tempIdx = prev.findIndex(m => m.id?.toString() === message.tempId.toString());
        }

        if (tempIdx === -1) {
          if (message.type === 'file' || message.type === 'image' || message.type === 'video' || message.type === 'audio') {
            tempIdx = prev.findIndex(
              m => m.status === 'sending' && m.type === message.type && m.fileName && incomingFileName && m.fileName === incomingFileName && m.senderId === message.senderId
            );
          } else {
            tempIdx = prev.findIndex(
              m => m.status === 'sending' && m.content === message.content && m.senderId === message.senderId
            );
          }
        }

        const mappedMessage: any = mapThreadMessage(message, userId, { status: 'sent', includeSeenBy: true });

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

    const handleConversationUpdated = (data: any) => {
      if (data.conversationId?.toString() === conversationId?.toString()) {
        if (data.action === 'members_added' || data.action === 'member_left') {
          fetchMessages(false);
          if (isGroup) fetchGroupDetails();
        }
      }
    };

    socketService.on('conversation_updated', handleConversationUpdated);

    return () => {
      if (conversationIdNum) socketService.emit('leave_conversation', conversationIdNum);
      socketService.off('new_message', handleNewMessage);
      socketService.off('message_seen', handleMessageSeen);
      socketService.off('conversation_updated', handleConversationUpdated);
    };
  }, [conversationId, userId, isFocused, fetchMessages, isGroup, flatListRef, fetchGroupDetails, setMessages]);

  useEffect(() => {
    setActiveConversationId(conversationId);
    return () => {
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    };
  }, [conversationId]);

  return {
    fetchMessages,
    fetchAllMedia,
  };
}
