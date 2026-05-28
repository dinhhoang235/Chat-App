import { useState, useEffect, useCallback } from "react";
import { Image } from "react-native";
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

export function useConversations() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheReadyUserId, setCacheReadyUserId] = useState<number | null>(null);
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
    // don't attempt to hit the API if we don't have a logged-in user yet
    if (!user) {
      setLoading(false);
      return;
    }

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
    } catch (err: any) {
      // 401 may occur if auth isn't ready; we already guard but log others
      if (err?.response?.status !== 401) {
        console.error("Fetch conversations error:", err);
      }
    } finally {
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

  useEffect(() => {
    if (isFocused && user) {
      fetchConversations();
    }

    const handleUpdate = (data: any) => {
      fetchConversations();
    };

    const handleNewMessage = (message: any) => {
      // Trigger a re-fetch to get the latest order and message text
      fetchConversations();
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
      fetchConversations();
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
    };
  }, [fetchConversations, isFocused, user]);

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
