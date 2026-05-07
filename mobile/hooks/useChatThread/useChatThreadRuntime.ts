import { useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setActiveConversationId,
  activeConversationId,
} from "@/services/notificationState";
import { chatApi } from "@/services/chat";
import { userAPI } from "@/services/user";
import { socketService } from "@/services/socket";
import {
  dedupeById,
  mapThreadMedia,
  mapThreadMessage,
} from "@/utils/chatThread";
import { log, error } from "@/utils/logger";

const MESSAGE_CACHE_PREFIX = "chat_messages_cache:";
const messageCacheMemory = new Map<string, any[]>();

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
  setTargetUserStatus: React.Dispatch<
    React.SetStateAction<{ status: string; lastSeen: number | null } | null>
  >;
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
  const getMessageCacheKey = useCallback((conversationIdValue: string) => {
    return `${MESSAGE_CACHE_PREFIX}${conversationIdValue}`;
  }, []);

  const markAsReadWithRetry = useCallback(
    async (conversationId: number, retries = 3, initialDelay = 200) => {
      let currentDelay = initialDelay;
      for (let i = 0; i < retries; i++) {
        try {
          await chatApi.markAsRead(conversationId);
          log(`[ChatThread] ✅ Marked conversation ${conversationId} as read`);
          return;
        } catch (err) {
          if (i < retries - 1) {
            log(
              `[ChatThread] ⚠️ Mark as read retry ${i + 1}/${retries - 1}, waiting ${currentDelay}ms...`,
            );
            await new Promise((resolve) => setTimeout(resolve, currentDelay));
            currentDelay *= 2; // exponential backoff
          } else {
            error(
              `[ChatThread] ❌ Mark as read failed after ${retries} retries:`,
              err,
            );
          }
        }
      }
    },
    [],
  );

  const persistMessagesCache = useCallback(
    async (conversationIdValue: string, nextMessages: any[]) => {
      try {
        // OPTIMIZATION #5: Increased cache from 50 to 200 messages for faster offline access & 2nd open
        messageCacheMemory.set(conversationIdValue, nextMessages.slice(0, 200));
        await AsyncStorage.setItem(
          getMessageCacheKey(conversationIdValue),
          JSON.stringify(nextMessages.slice(0, 200)),
        );
      } catch (err) {
        error("Persist messages cache error:", err);
      }
    },
    [getMessageCacheKey],
  );

  const loadMessagesCache = useCallback(
    async (conversationIdValue: string) => {
      try {
        const cachedMemory = messageCacheMemory.get(conversationIdValue);
        if (cachedMemory) {
          return cachedMemory;
        }

        const cached = await AsyncStorage.getItem(
          getMessageCacheKey(conversationIdValue),
        );
        if (!cached) return [] as any[];

        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        error("Load messages cache error:", err);
        return [] as any[];
      }
    },
    [getMessageCacheKey],
  );

  useEffect(() => {
    allMediaRef.current = allMedia;
  }, [allMedia, allMediaRef]);

  useEffect(() => {
    const checkExisting = async () => {
      if (isNewConversation && targetUserIdState && !conversationId) {
        try {
          const response = await chatApi.startConversation(
            Number(targetUserIdState),
          );
          const conv = response.data;
          const convId = conv.id || conv.conversationId;
          if (convId && conv.messages && conv.messages.length > 0) {
            setConversationId(convId.toString());
          }
        } catch {
          log("No existing conversation found yet, sticking with 'new' mode");
        }
      }
    };
    checkExisting();
  }, [isNewConversation, targetUserIdState, conversationId, setConversationId]);

  const fetchAllMedia = useCallback(
    async (isLoadMore = false) => {
      if (!id || id === "new") return;
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
          setAllMedia((prev) => dedupeById([...prev, ...mapped]));
        } else {
          setAllMedia(dedupeById(mapped));
        }

        setHasMoreMedia(newMedia.length >= 30);
      } catch (err) {
        error("Fetch all media error:", err);
      } finally {
        if (isLoadMore) setLoadingMoreMedia(false);
      }
    },
    [
      id,
      userId,
      hasMoreMedia,
      loadingMoreMedia,
      allMediaRef,
      setAllMedia,
      setHasMoreMedia,
      setLoadingMoreMedia,
    ],
  );

  const markAsReadWithRetryRef = useRef(markAsReadWithRetry);
  useEffect(() => {
    markAsReadWithRetryRef.current = markAsReadWithRetry;
  }, [markAsReadWithRetry]);

  const fetchMessagesRef = useRef(fetchMessages);
  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
  }, [fetchMessages]);

  const fetchGroupDetailsRef = useRef(fetchGroupDetails);
  useEffect(() => {
    fetchGroupDetailsRef.current = fetchGroupDetails;
  }, [fetchGroupDetails]);

  const fetchGroupDetails = useCallback(async () => {
    if (!id || params.isGroup !== "true") return;
    try {
      const response = await chatApi.getConversationDetails(id);
      setGroupDetails(response.data);
    } catch (err) {
      error("Fetch group details error:", err);
    }
  }, [id, params.isGroup, setGroupDetails]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  useEffect(() => {
    if (params.isGroup !== "true") return;

    const handleUpdate = (data: any) => {
      if (data.conversationId?.toString() === id?.toString()) {
        fetchGroupDetails();
      }
    };

    socketService.on("conversation_updated", handleUpdate);
    return () => {
      socketService.off("conversation_updated", handleUpdate);
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
      error("Fetch target user status error:", err);
    }
  }, [targetUserIdState, setTargetUserStatus, setTargetUser]);

  useEffect(() => {
    if (isFocused && targetUserIdState) {
      getTargetUserStatus();
    }
  }, [isFocused, targetUserIdState, getTargetUserStatus]);

  useEffect(() => {
    if (!isFocused) return;

    const handleStatusChanged = (data: {
      userId: number;
      status: string;
      lastSeen?: number;
    }) => {
      if (targetUserIdState && data.userId === Number(targetUserIdState)) {
        setTargetUserStatus({
          status: data.status,
          lastSeen: data.lastSeen || null,
        });
      }
    };

    socketService.on("user_status_changed", handleStatusChanged);
    return () => {
      socketService.off("user_status_changed", handleStatusChanged);
    };
  }, [isFocused, targetUserIdState, setTargetUserStatus]);

  const fetchMessages = useCallback(
    async (isLoadMore = false) => {
      if (!conversationId) return;
      if (isLoadMore && (!hasMore || loadingMore)) return;

      try {
        if (isLoadMore) setLoadingMore(true);

        const cursor =
          isLoadMore && messagesRef.current.length > 0
            ? messagesRef.current[messagesRef.current.length - 1].id
            : undefined;

        const response = await chatApi.getMessages(
          Number(conversationId),
          cursor,
          20,
        );
        const newMessages = response.data;

        const mapped = newMessages.map((m: any) =>
          mapThreadMessage(m, userId, { includeSeenBy: true }),
        );

        if (isLoadMore) {
          setMessages((prev) => dedupeById([...prev, ...mapped]));
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
        error("[ChatThread] Fetch messages error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      conversationId,
      userId,
      hasMore,
      loadingMore,
      targetUserIdState,
      messagesRef,
      setHasMore,
      setInitialFetchDone,
      setLoading,
      setLoadingMore,
      setMessages,
      setTargetUserIdState,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    let timeout: NodeJS.Timeout;

    const init = async () => {
      const hasPreloadedMessages = messagesRef.current.length > 0;

      // Reset state for new conversation
      setInitialFetchDone(false);
      setHasMore(true);

      if (!conversationId) return;

      // Only set loading if we truly have nothing to show
      if (!hasPreloadedMessages) {
        setLoading(true);
      } else {
        // If we have preloaded messages, mark as done immediately
        setInitialFetchDone(true);
        setLoading(false);
        return; // Don't fetch if we have preloaded messages
      }

      // Try to load from cache
      const cachedMessages = await loadMessagesCache(conversationId);

      if (
        !cancelled &&
        cachedMessages.length > 0 &&
        messagesRef.current.length === 0
      ) {
        setMessages(cachedMessages);
        setInitialFetchDone(true);
        setLoading(false);
        return; // Don't fetch if we have cache
      }

      // Set aggressive timeout to ensure loading is cleared
      timeout = setTimeout(() => {
        if (!cancelled) {
          setLoading(false);
          setInitialFetchDone(true);
        }
      }, 1500);

      // Mark as done so focus effect won't refetch
      setInitialFetchDone(true);

      // Always fetch fresh messages from network in the background
      fetchMessages(false);
    };

    init();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conversationId, // ONLY depend on conversationId change to prevent loops
  ]);

  useEffect(() => {
    if (!conversationId || conversationId === "new") return;
    if (!initialFetchDone && messages.length === 0) return;

    const timeoutId = setTimeout(() => {
      persistMessagesCache(conversationId, messages);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [conversationId, initialFetchDone, messages, persistMessagesCache]);

  useEffect(() => {
    if (!isFocused || !conversationId || conversationId === "new") return;

    const conversationIdNum = parseInt(conversationId, 10);

    socketService.emit("join_conversation", conversationIdNum);

    // Mark as read with retry logic
    markAsReadWithRetry(conversationIdNum);

    return () => {
      socketService.emit("leave_conversation", conversationIdNum);
    };
  }, [conversationId, isFocused, markAsReadWithRetry]);

  useEffect(() => {
    if (!isFocused || !conversationId) return;
    if (initialFetchDone) return;

    fetchMessages(false);
    fetchAllMedia();
  }, [
    conversationId,
    isFocused,
    initialFetchDone,
    fetchMessages,
    fetchAllMedia,
  ]);

  useEffect(() => {
    if (!isFocused) return;

    log(
      `[ChatThread] 📡 Setting up socket listeners for conversation ${conversationId}`,
    );

    const handleMessageSeen = (data: any) => {
      const { userId: seenByUserId, seenAt, user: seenUser } = data;
      if (seenByUserId === userId) return;

      log(`[ChatThread] 👁️ Message seen update from user ${seenByUserId}`);

      const userData = seenUser || {
        id: seenByUserId,
        fullName: "User",
        avatar: undefined,
      };

      setMessages((prev) =>
        prev.map((m) => {
          if (new Date(m.createdAt) <= new Date(seenAt)) {
            const alreadySeen = m.seenBy?.some(
              (u: any) => u.id === seenByUserId,
            );
            if (!alreadySeen && m.senderId !== seenByUserId) {
              return { ...m, seenBy: [...(m.seenBy || []), userData] };
            }
          }
          return m;
        }),
      );
    };

    socketService.on("message_seen", handleMessageSeen);

    const handleNewMessage = (message: any) => {
      if (
        isFocused &&
        conversationId &&
        message.conversationId === parseInt(conversationId, 10)
      ) {
        log(
          `[ChatThread] 💬 New message received in conversation ${conversationId}:`,
          message,
        );
        if (message.senderId !== userId) {
          // Mark as read with retry (fire and forget)
          markAsReadWithRetryRef.current(message.conversationId);
        }
      }

      setMessages((prev) => {
        const isDuplicate = prev.find(
          (m) => m.id?.toString() === message.id?.toString(),
        );
        if (isDuplicate) return prev;

        let incomingFileName: string | undefined;
        if (
          message.type === "file" ||
          message.type === "image" ||
          message.type === "video" ||
          message.type === "audio"
        ) {
          try {
            const info =
              typeof message.content === "string"
                ? JSON.parse(message.content)
                : message.content;
            incomingFileName = info?.name;
          } catch {
            if (
              message.type === "image" ||
              message.type === "video" ||
              message.type === "audio"
            ) {
              incomingFileName = undefined;
            }
          }
        }

        let tempIdx = -1;
        if (message.tempId) {
          tempIdx = prev.findIndex(
            (m) => m.id?.toString() === message.tempId.toString(),
          );
        }

        if (tempIdx === -1) {
          if (
            message.type === "file" ||
            message.type === "image" ||
            message.type === "video" ||
            message.type === "audio"
          ) {
            tempIdx = prev.findIndex(
              (m) =>
                m.status === "sending" &&
                m.type === message.type &&
                m.fileName &&
                incomingFileName &&
                m.fileName === incomingFileName &&
                m.senderId === message.senderId,
            );
          } else {
            tempIdx = prev.findIndex(
              (m) =>
                m.status === "sending" &&
                m.content === message.content &&
                m.senderId === message.senderId,
            );
          }
        }

        const mappedMessage: any = mapThreadMessage(message, userId, {
          status: "sent",
          includeSeenBy: true,
        });

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

    socketService.on("new_message", handleNewMessage);

    const handleConversationUpdated = (data: any) => {
      if (data.conversationId?.toString() === conversationId?.toString()) {
        if (data.action === "members_added" || data.action === "member_left") {
          fetchMessagesRef.current(false);
          if (isGroup) fetchGroupDetailsRef.current();
        }
      }
    };

    socketService.on("conversation_updated", handleConversationUpdated);

    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("message_seen", handleMessageSeen);
      socketService.off("conversation_updated", handleConversationUpdated);
    };
  }, [conversationId, userId, isFocused, isGroup, flatListRef, setMessages]);

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
