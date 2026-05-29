import { useCallback, useEffect, useRef } from "react";
import { getAvatarUrl } from "@/utils/avatar";
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
import { chatThreadCache } from "@/utils/chatThreadCache";
import prefetchQueue from "@/utils/prefetchQueue";
import { getCachedPath } from "@/utils/imageCache";
import { log, error } from "@/utils/logger";
import { resolveMediaUri } from "@/components/chat/messageParts/messageHelpers";
import { setImageMetadata } from "@/utils/imageMetadataCache";

// Schedule a low-priority task without blocking render. Returns a cancel function.
const scheduleLowPriorityTask = (task: () => void) => {
  try {
    const ric = (globalThis as any).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(() => task());
      return () => (globalThis as any).cancelIdleCallback?.(id);
    }
  } catch {}
  const t = setTimeout(task, 50);
  return () => clearTimeout(t);
};

const MESSAGE_CACHE_PREFIX = "chat_messages_cache:";
const messageCacheMemory = new Map<string, any[]>();

const messageFileInfoKey = (message: any) => {
  const fileInfo = message?.fileInfo || {};
  return [
    fileInfo.url || "",
    fileInfo.thumbnailUrl || fileInfo.thumbnail || fileInfo.thumb || "",
    fileInfo.width || "",
    fileInfo.height || "",
    fileInfo.duration || "",
  ].join("|");
};

const areMessageListsEffectivelyEqual = (prev: any[], next: any[]) => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const prevMessage = prev[i];
    const nextMessage = next[i];
    if (prevMessage === nextMessage) continue;
    if (!prevMessage || !nextMessage) return false;
    if (prevMessage.id?.toString() !== nextMessage.id?.toString()) return false;
    if (prevMessage.type !== nextMessage.type) return false;
    if (prevMessage.status !== nextMessage.status) return false;
    if (prevMessage.isRevoked !== nextMessage.isRevoked) return false;
    if (prevMessage.text !== nextMessage.text) return false;
    if (prevMessage.content !== nextMessage.content) return false;
    if (prevMessage.fromMe !== nextMessage.fromMe) return false;
    if (prevMessage.edited !== nextMessage.edited) return false;
    if (prevMessage.senderId !== nextMessage.senderId) return false;
    if (prevMessage.createdAt !== nextMessage.createdAt) return false;
    if (prevMessage.updatedAt !== nextMessage.updatedAt) return false;
    if (prevMessage.reactions?.length !== nextMessage.reactions?.length)
      return false;
    if (prevMessage.seenBy?.length !== nextMessage.seenBy?.length) return false;
    if (messageFileInfoKey(prevMessage) !== messageFileInfoKey(nextMessage))
      return false;
  }

  return true;
};

/**
 * Update a specific message in the module-level cache as revoked.
 * Called by global socket handlers (e.g. useConversations) when the
 * chat screen is NOT mounted so the cache stays accurate.
 */
export const revokeMessageInCache = (
  conversationId: string | number,
  messageId: number,
) => {
  const key = conversationId.toString();
  const cached = messageCacheMemory.get(key);
  if (cached) {
    const updated = cached.map((m) =>
      m.id === messageId
        ? {
            ...m,
            type: "revoked",
            content: "Tin nhắn đã được thu hồi",
            isRevoked: true,
          }
        : m,
    );
    messageCacheMemory.set(key, updated);
    // Persist to AsyncStorage so it survives app restarts
    AsyncStorage.setItem(
      `${MESSAGE_CACHE_PREFIX}${key}`,
      JSON.stringify(updated.slice(0, 200)),
    ).catch(() => {});
  }
};

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
  const initialFetchInFlightRef = useRef<string | null>(null);
  const initialMediaRefreshScheduledRef = useRef<string | null>(null);
  const initialVisibleMediaWarmupRef = useRef<string | null>(null);
  const initialCachedMediaWarmupRef = useRef<string | null>(null);

  const warmMediaUris = useCallback(async (uris: string[]) => {
    const seen = new Set<string>();

    // log removed

    const tasks = uris.map(async (uri) => {
      if (!uri || seen.has(uri)) return;
      seen.add(uri);

      try {
        const cached = await getCachedPath(uri);
        if (cached) {
          // log removed
          return;
        }
      } catch {}

      try {
        // log removed
        await prefetchQueue.enqueue(uri).catch(() => null);
      } catch {}
    });

    await Promise.all(tasks);

    // log removed
  }, []);

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
    (conversationIdValue: string, nextMessages: any[]) => {
      try {
        // OPTIMIZATION #5: Keep a memory cache immediately for quick access
        // and defer heavy serialization + AsyncStorage write until after
        // UI interactions complete so it doesn't block navigation animations.
        messageCacheMemory.set(conversationIdValue, nextMessages.slice(0, 200));

        setTimeout(() => {
          AsyncStorage.setItem(
            getMessageCacheKey(conversationIdValue),
            JSON.stringify(nextMessages.slice(0, 200)),
          ).catch((err) => {
            error("Persist messages cache error:", err);
          });
        }, 0);
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

  const fetchGroupDetails = useCallback(async () => {
    const activeId = conversationId || id;
    if (!activeId || activeId === "new" || params.isGroup !== "true") return;

    try {
      const response = await chatApi.getConversationDetails(activeId);
      setGroupDetails(response.data);
      chatThreadCache.setGroupDetails(activeId, response.data);
    } catch (err) {
      error("Fetch group details error:", err);
    }
  }, [id, conversationId, params.isGroup, setGroupDetails]);

  const fetchGroupDetailsRef = useRef(fetchGroupDetails);
  useEffect(() => {
    fetchGroupDetailsRef.current = fetchGroupDetails;
  }, [fetchGroupDetails]);

  const fetchMessages = useCallback(
    async (isLoadMore = false) => {
      if (!conversationId) return;
      if (isLoadMore && (!hasMore || loadingMore)) return;
      if (!isLoadMore && initialFetchInFlightRef.current === conversationId) {
        return;
      }

      // timing removed

      try {
        if (isLoadMore) setLoadingMore(true);
        else initialFetchInFlightRef.current = conversationId;

        const cursor =
          isLoadMore && messagesRef.current.length > 0
            ? messagesRef.current[messagesRef.current.length - 1].id
            : undefined;

        // const networkStartedAt = globalThis?.performance?.now?.() ?? Date.now();

        const response = await chatApi.getMessages(
          Number(conversationId),
          cursor,
          20,
        );

        // log removed

        const newMessages = response.data;

        // const mappingStartedAt = globalThis?.performance?.now?.() ?? Date.now();
        const mapped = newMessages.map((m: any) =>
          mapThreadMessage(m, userId, { includeSeenBy: true }),
        );

        // log removed

        if (
          !isLoadMore &&
          initialVisibleMediaWarmupRef.current !== conversationId
        ) {
          initialVisibleMediaWarmupRef.current = conversationId;

          const warmUris: string[] = [];
          const warmMessages: any[] = [];
          for (const message of mapped) {
            if (message?.type !== "image" && message?.type !== "video")
              continue;
            warmMessages.push(message);
            if (warmMessages.length >= 4) break;
          }

          for (const message of warmMessages) {
            const fileInfo = message.fileInfo || {};
            const uri =
              fileInfo.thumbnailUrl ||
              fileInfo.thumbnail ||
              fileInfo.thumb ||
              fileInfo.url;
            if (!uri) continue;
            warmUris.push(resolveMediaUri(uri));
          }

          if (warmUris.length > 0) {
            void warmMediaUris(warmUris);
          }
        }

        if (isLoadMore) {
          setMessages((prev) => {
            const next = dedupeById([...prev, ...mapped]);
            return next;
          });
        } else {
          const nextMessages = dedupeById(mapped);
          setMessages((prev) =>
            areMessageListsEffectivelyEqual(prev, nextMessages)
              ? prev
              : nextMessages,
          );
          setInitialFetchDone(true);
        }

        setHasMore(newMessages.length >= 20);

        if (!targetUserIdState && mapped.length > 0) {
          const otherMessage = mapped.find((m: any) => String(m.senderId) !== String(userId));
          if (otherMessage) {
              setTargetUserIdState(otherMessage.senderId.toString());
          }
        }
      } catch (err) {
        error("[ChatThread] Fetch messages error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        if (!isLoadMore && initialFetchInFlightRef.current === conversationId) {
          initialFetchInFlightRef.current = null;
        }
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
      warmMediaUris,
    ],
  );

  const getTargetUserStatus = useCallback(async () => {
    if (!targetUserIdState) return;
    try {
      const data = await userAPI.getUserById(Number(targetUserIdState));
      if (data) {
        setTargetUserStatus({ status: data.status, lastSeen: data.lastSeen });
        setTargetUser(data);
        // Update contactName on messages from this user (same as groupDetails effect)
        setMessages((prev: any[]) => {
          let changed = false;
          const next = prev.map((m: any) => {
            if (m.fromMe) return m;
            if (String(m.senderId) !== String(targetUserIdState)) return m;
            if (m.contactName === data.fullName) return m;
            changed = true;
            return { ...m, contactName: data.fullName, contactAvatar: data.avatar ? getAvatarUrl(data.avatar) ?? undefined : undefined };
          });
          return changed ? next : prev;
        });
      }
    } catch (err) {
      error("Fetch target user status error:", err);
    }
  }, [targetUserIdState, setTargetUserStatus, setTargetUser]);

  useEffect(() => {
    if (!(isFocused && targetUserIdState)) return;
    const cancel = scheduleLowPriorityTask(() => {
      void getTargetUserStatus();
    });
    return () => cancel();
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

  useEffect(() => {
    let cancelled = false;
    let timeout: NodeJS.Timeout;

    const init = async () => {
      const hasPreloadedMessages = messagesRef.current.length > 0;

      // Reset state for new conversation
      setInitialFetchDone(false);
      setHasMore(true);

      if (!conversationId) return;

      // Show cached/preloaded messages immediately (no loading spinner needed)
      // but ALWAYS fetch fresh data from the server in the background so that
      // revoked / deleted messages are corrected without a flash.
      if (!hasPreloadedMessages) {
        // Delay showing a loading spinner briefly so that a fast cache
        // read does not show a spinner unnecessarily. If cache is slow
        // to read or missing, the spinner will appear after `loadingDelayMs`.
        const loadingDelayMs = 300;
        let loadingTimeout: NodeJS.Timeout | null = setTimeout(() => {
          if (!cancelled) setLoading(true);
        }, loadingDelayMs);

        // Try to read cache as soon as possible (do not defer to interactions)
        // so we can render cached messages immediately on open.
        // timing removed
        loadMessagesCache(conversationId)
          .then((cachedMessages) => {
            // log removed
            if (
              !cancelled &&
              cachedMessages.length > 0 &&
              messages.length === 0 &&
              messagesRef.current.length === 0
            ) {
              setMessages(cachedMessages);
              setInitialFetchDone(true);
            }
          })
          .catch(() => {})
          .finally(() => {
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
              loadingTimeout = null;
            }
          });

        // Set aggressive timeout to ensure loading is cleared even if cache and
        // network are both slow.
        timeout = setTimeout(() => {
          if (!cancelled) {
            setLoading(false);
            setInitialFetchDone(true);
          }
        }, 1500);
      } else {
        // We already have messages to display — hide spinner immediately.
        setLoading(false);
      }

      // Mark as done so focus effect won't trigger a redundant refetch
      setInitialFetchDone(true);

      // Always fetch fresh messages from the network in the background.
      // This ensures revoked/deleted messages are never stuck in stale cache.
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
    if (!messages || messages.length === 0) return;

    let cancelled = false;

    const missingMetadata = messages
      .filter((message) => {
        if (message?.type !== "image") return false;
        const fileInfo = message.fileInfo || {};
        return !fileInfo.thumbnailUrl || !fileInfo.width || !fileInfo.height;
      })
      .slice(0, 6);

    if (missingMetadata.length === 0) return;

    for (const message of missingMetadata) {
      const fileInfo = message.fileInfo || {};
      const thumbnailUrl =
        fileInfo.thumbnailUrl ||
        fileInfo.thumbnail ||
        fileInfo.thumb ||
        fileInfo.url;

      if (message.id != null) {
        setImageMetadata(message.id, {
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
        });
      }
    }

    setTimeout(() => {
      (async () => {
        const updates = await Promise.all(
          missingMetadata.map(async (message) => {
            const fileInfo = message.fileInfo || {};
            if (fileInfo.width && fileInfo.height) return null;

            const sourceUri = fileInfo.url
              ? resolveMediaUri(fileInfo.url)
              : null;
            if (!sourceUri) return null;

            const size = await new Promise<{
              width: number;
              height: number;
            } | null>((resolve) => {
              const timeout = setTimeout(() => resolve(null), 4000);

              RNImage.getSize(
                sourceUri,
                (width, height) => {
                  clearTimeout(timeout);
                  if (width > 0 && height > 0) {
                    resolve({ width, height });
                  } else {
                    resolve(null);
                  }
                },
                () => {
                  clearTimeout(timeout);
                  resolve(null);
                },
              );
            });

            if (!size) return null;
            return { id: message.id, width: size.width, height: size.height };
          }),
        );

        if (cancelled) return;

        const byId = new Map<string, { width: number; height: number }>();
        for (const update of updates) {
          if (update?.id != null) {
            byId.set(update.id.toString(), {
              width: update.width,
              height: update.height,
            });
          }
        }

        if (byId.size === 0) return;

        for (const [key, update] of byId.entries()) {
          setImageMetadata(key, {
            width: update.width,
            height: update.height,
          });
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
    };
  }, [messages, setMessages]);

  useEffect(() => {
    if (!conversationId || !isFocused) return;
    if (!messages || messages.length === 0) return;
    if (initialCachedMediaWarmupRef.current === conversationId) return;
    initialCachedMediaWarmupRef.current = conversationId;

    const cancel = scheduleLowPriorityTask(() => {
      void (async () => {
        try {
          const toWarm: string[] = [];
          const seen = new Set<string>();

          for (const message of messages.slice(0, 10)) {
            if (message?.type !== "image" && message?.type !== "video")
              continue;
            const fileInfo = message.fileInfo || {};
            const uri =
              fileInfo.thumbnailUrl ||
              fileInfo.thumbnail ||
              fileInfo.thumb ||
              fileInfo.url;
            if (!uri) continue;
            const resolved = resolveMediaUri(uri);
            if (seen.has(resolved)) continue;
            seen.add(resolved);
            toWarm.push(resolved);
            if (toWarm.length >= 3) break;
          }

          for (const uri of toWarm) {
            const cached = await getCachedPath(uri).catch(() => null);
            if (cached) continue;
            await prefetchQueue.enqueue(uri).catch(() => null);
          }
        } catch {
          // ignore
        }
      })();
    });

    return () => cancel();
  }, [conversationId, isFocused, messages]);

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
    if (initialMediaRefreshScheduledRef.current === conversationId) return;

    fetchMessages(false);
  }, [conversationId, isFocused, initialFetchDone, fetchMessages]);

  useEffect(() => {
    if (isFocused && isGroup && conversationId) {
      fetchGroupDetails();
    }
  }, [isFocused, isGroup, conversationId, fetchGroupDetails]);

  // When groupDetails loads (after the initial render), FlashList won't re-render
  // existing cells unless the data items themselves change. Patch each message
  // with the sender's name + avatar so the FlashList data array is updated and
  // bubbles re-render with correct initials instead of the 'U' fallback.
  useEffect(() => {
    if (!groupDetails?.participants || !setMessages) return;

    const participantMap = new Map<string, { fullName: string; avatar: string | null }>();
    for (const p of groupDetails.participants) {
      if (p.user?.id != null) {
        participantMap.set(String(p.user.id), {
          fullName: p.user.fullName,
          avatar: p.user.avatar ?? null,
        });
      }
    }

    setMessages((prev: any[]) => {
      let changed = false;
      const next = prev.map((m: any) => {
        if (!m.senderId || m.fromMe) return m;
        const participant = participantMap.get(String(m.senderId));
        if (!participant) return m;

        const newContactName = participant.fullName;
        const newContactAvatar = participant.avatar
          ? getAvatarUrl(participant.avatar) ?? undefined
          : undefined;

        if (m.contactName === newContactName && m.contactAvatar === newContactAvatar) return m;
        changed = true;
        return { ...m, contactName: newContactName, contactAvatar: newContactAvatar };
      });
      return changed ? next : prev;
    });
  }, [groupDetails, setMessages]);

  useEffect(() => {
    if (!isFocused) return;

    log(
      `[ChatThread] 📡 Setting up socket listeners for conversation ${conversationId}`,
    );

    const handleMessageSeen = (data: any) => {
      const { userId: seenByUserId, seenAt, user: seenUser } = data;
      if (seenByUserId === userId) return;

      log(`[ChatThread] 👁️ Message seen update from user ${seenByUserId}`);

      const userData = {
        ...(seenUser || {
          id: seenByUserId,
          fullName: "User",
          avatar: undefined,
        }),
        seenAt: seenAt,
      };

      setMessages((prev) =>
        prev.map((m) => {
          if (new Date(m.createdAt) <= new Date(seenAt)) {
            const alreadySeen = m.seenBy?.some(
              (u: any) => u.id === seenByUserId,
            );
            if (!alreadySeen && m.senderId !== seenByUserId) {
              const nextSeenBy = [...(m.seenBy || []), userData];
              nextSeenBy.sort(
                (a: any, b: any) =>
                  new Date(a.seenAt || 0).getTime() -
                  new Date(b.seenAt || 0).getTime(),
              );
              return { ...m, seenBy: nextSeenBy };
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
        if (String(message.senderId) !== String(userId)) {
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

        // Background-prefetch thumbnail for incoming image messages
        (async () => {
          try {
            if (mappedMessage?.type === "image" && mappedMessage.fileInfo) {
              const t =
                mappedMessage.fileInfo.thumbnailUrl ||
                mappedMessage.fileInfo.thumbnail ||
                mappedMessage.fileInfo.thumb;
              if (t) {
                // Use shared prefetch queue to avoid parallel duplicate downloads
                prefetchQueue.enqueue(resolveMediaUri(t)).catch(() => null);
              }
            }
          } catch {}
        })();

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

    const handleMessageEdited = (data: {
      message: any;
      conversationId: number;
    }) => {
      if (data.conversationId.toString() === conversationId?.toString()) {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id?.toString() === data.message.id?.toString()
              ? mapThreadMessage(data.message, userId, {
                  status: m.status === "sending" ? "sending" : "sent",
                  includeSeenBy: true,
                })
              : m,
          );
          persistMessagesCache(data.conversationId.toString(), next);
          return next;
        });
      }
    };

    const handleMessageRevoked = (data: {
      messageId: number;
      conversationId: number;
    }) => {
      if (data.conversationId.toString() === conversationId?.toString()) {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id?.toString() === data.messageId?.toString()
              ? {
                  ...m,
                  type: "revoked",
                  content: "Tin nhắn đã được thu hồi",
                  isRevoked: true,
                }
              : m,
          );
          // Immediately persist updated cache so stale messages don't
          // flash back when the user re-enters this conversation.
          persistMessagesCache(data.conversationId.toString(), next);
          return next;
        });
      }
    };

    const handleMessageReaction = (data: {
      messageId: number;
      conversationId: number;
      reactions: any[];
    }) => {
      if (data.conversationId.toString() === conversationId?.toString()) {
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id?.toString() === data.messageId?.toString()
              ? { ...m, reactions: data.reactions }
              : m,
          );
          persistMessagesCache(data.conversationId.toString(), next);
          return next;
        });
      }
    };

    socketService.on("message_edited", handleMessageEdited);
    socketService.on("message_revoked", handleMessageRevoked);
    socketService.on("message_reaction", handleMessageReaction);

    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("message_seen", handleMessageSeen);
      socketService.off("conversation_updated", handleConversationUpdated);
      socketService.off("message_edited", handleMessageEdited);
      socketService.off("message_revoked", handleMessageRevoked);
      socketService.off("message_reaction", handleMessageReaction);
    };
  }, [
    conversationId,
    userId,
    isFocused,
    isGroup,
    flatListRef,
    setMessages,
    persistMessagesCache,
  ]);

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
