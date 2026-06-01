import { useState, useEffect, useCallback, useRef } from "react";
import { Image, InteractionManager } from "react-native";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";
import { chatApi } from "@/services/chat";
import { socketService } from "@/services/socket";
import { mapConversationResponse } from "@/utils/conversation";
import {
  loadConversationListCache,
  saveConversationListCache,
} from "@/utils/conversationListCache";
import { useConversationSelection } from "@/hooks/useConversations/useConversationSelection";
import { useConversationActions } from "@/hooks/useConversations/useConversationActions";
import { revokeMessageInCache } from "@/hooks/useChatThread/useChatThreadRuntime";
import { chatThreadCache } from "@/utils/chatThreadCache";
import prefetchQueue from "@/utils/prefetchQueue";
import { prefetchComposite } from "@/utils/groupCompositeCache";
import { resolveMediaUri } from "@/components/chat/messageParts/messageHelpers";

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

const warmConversationInitialMedia = (conversation: any) => {
  if (!conversation || !Array.isArray(conversation.initialMessages)) return;

  const seen = new Set<string>();
  const uris: string[] = [];

  for (const message of conversation.initialMessages) {
    if (!message || (message.type !== "image" && message.type !== "video"))
      continue;

    let content: any = message.content;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        content = null;
      }
    }

    const uri =
      content?.thumbnailUrl ||
      content?.thumbnail ||
      content?.thumb ||
      content?.url;

    if (!uri) continue;

    const resolved = resolveMediaUri(uri);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    uris.push(resolved);

    if (uris.length >= 3) break;
  }

  if (uris.length === 0) return;
  // log removed

  for (const uri of uris) {
    void prefetchQueue.enqueue(uri).catch(() => null);
  }
};

export function useConversations() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheReadyUserId, setCacheReadyUserId] = useState<number | null>(null);
  const lastFetchRef = useRef(0);
  const isFetchingRef = useRef(false);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    startChatVisible,
    setStartChatVisible,
    toggleSelect,
    handleSelectAll,
    handleCancelSelection,
  } = useConversationSelection(data);

  const {
    handleMarkRead,
    handleMarkReadSingle,
    handleDeleteConversation,
    handleDeleteSelected,
    handleMute,
    handleUnmute,
    handlePin,
    handleMarkUnread,
  } = useConversationActions({
    selectedIds,
    setData,
    setSelectionMode,
    setSelectedIds,
  });

  useEffect(() => {
    if (!user) {
      setData([]);
      setLoading(false);
      setCacheReadyUserId(null);
      return;
    }

    let cancelled = false;
    setCacheReadyUserId(null);

    const hydrateCache = async () => {
      const cached = await loadConversationListCache(user.id, colors);
      if (cancelled || cached.length === 0) return;

      setData(cached);

      scheduleLowPriorityTask(() => {
        cached.slice(0, 1).forEach((conversation: any) => {
          warmConversationInitialMedia(conversation);
        });
      });
    };

    hydrateCache().finally(() => {
      if (!cancelled) {
        setCacheReadyUserId(user.id);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, colors]);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const response = await chatApi.getConversations();
      const mapped = response.data
        .map((conv: any) => mapConversationResponse(conv, user, colors))
        .sort((a: any, b: any) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.updatedAt - a.updatedAt;
        });
      setData(mapped);

      scheduleLowPriorityTask(() => {
        mapped.slice(0, 1).forEach((conversation: any) => {
          warmConversationInitialMedia(conversation);
        });
      });

      // Prefetch avatar images so they appear immediately in the list
      try {
        const urls = mapped
          .map((c: any) => c.avatar)
          .filter((u: any) => typeof u === "string" && u.length > 0);
        if (urls.length > 0) {
          // Prefetch avatars in background without blocking the main flow.
          scheduleLowPriorityTask(() => {
            Promise.all(urls.map((u: string) => Image.prefetch(u))).catch(
              () => {},
            );
          });
        }
      } catch (e) {
        // ignore prefetch errors — doesn't block rendering
        console.warn("Avatar prefetch failed", e);
      }
      // Prefetch composite avatars to local cache (file://) for fast render
      scheduleLowPriorityTask(() => {
        mapped.forEach((conv: any) => {
          const convId = conv.id;
          const compositeUrl = conv.compositeAvatarUrl;
          if (compositeUrl) {
            void prefetchComposite(convId, compositeUrl).catch(() => null);
          }
        });
      });
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error("Fetch conversations error:", err);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [user, colors]);

  useEffect(() => {
    if (!user || cacheReadyUserId !== user.id) return;

    saveConversationListCache(user.id, data);
  }, [cacheReadyUserId, data, user]);

  useEffect(() => {
    setData((prev) =>
      prev.map((conversation) => ({
        ...conversation,
        color: conversation.isGroup
          ? colors.tint
          : conversation.avatar
            ? undefined
            : colors.tint,
      })),
    );
  }, [colors]);

  const debouncedFetchConversations = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchRef.current < 5000 || isFetchingRef.current) return;
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(() => {
      fetchConversations();
    }, 300);
  }, [fetchConversations]);

  useEffect(() => {
    if (isFocused && user) {
      const now = Date.now();
      if (now - lastFetchRef.current > 30000) {
        InteractionManager.runAfterInteractions(() => {
          lastFetchRef.current = Date.now();
          fetchConversations();
        });
      }
    }

    const handleUpdate = (data: any) => {
      debouncedFetchConversations();
    };

    const handleNewMessage = (message: any) => {
      debouncedFetchConversations();
    };

    const handleStatusChanged = (data: { userId: number; status: string }) => {
      setData((prev) =>
        prev.map((conv) => {
          // Update 1-1 conversations by targetUserId
          if (Number(conv.targetUserId) === data.userId) {
            return { ...conv, status: data.status };
          }
          // Update group conversations (update is still valid but status might be used differently)
          return conv;
        }),
      );
    };

    const handleMessageRevoked = (data: any) => {
      // Update both caches immediately so when user navigates into the chat
      // the correct revoked state is shown without a flash.
      if (data.conversationId) {
        const convId = data.conversationId.toString();
        // 1. Update runtime's messageCacheMemory + AsyncStorage
        revokeMessageInCache(convId, data.messageId);
        // 2. Update chatThreadCache (used as initialMessages on navigation)
        const cached = chatThreadCache.getMessages(convId);
        if (cached.length > 0) {
          const updated = cached.map((m: any) =>
            m.id === data.messageId
              ? {
                  ...m,
                  type: "revoked",
                  content: "Tin nhắn đã được thu hồi",
                  isRevoked: true,
                }
              : m,
          );
          chatThreadCache.setMessages(convId, updated);
        }
      }
      debouncedFetchConversations();
    };

    socketService.on("conversation_updated", handleUpdate);
    socketService.on("new_message", handleNewMessage);
    socketService.on("message_revoked", handleMessageRevoked);
    socketService.on("user_status_changed", handleStatusChanged);

    return () => {
      socketService.off("conversation_updated", handleUpdate);
      socketService.off("new_message", handleNewMessage);
      socketService.off("message_revoked", handleMessageRevoked);
      socketService.off("user_status_changed", handleStatusChanged);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    };
  }, [debouncedFetchConversations, fetchConversations, isFocused, user]);

  return {
    data,
    setData,
    loading,
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    startChatVisible,
    setStartChatVisible,
    toggleSelect,
    handleSelectAll,
    handleCancelSelection,
    handleMarkRead,
    handleMarkReadSingle,
    handleDeleteSelected,
    handleDeleteConversation,
    handleMute,
    handleUnmute,
    handlePin,
    handleMarkUnread,
    router,
    colors,
  };
}
