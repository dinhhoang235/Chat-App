import { useCallback, Dispatch, SetStateAction } from "react";
import { chatApi } from "@/services/chat";

interface ConversationActionParams {
  selectedIds: string[];
  setData: Dispatch<SetStateAction<any[]>>;
  setSelectionMode: (value: boolean) => void;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
}

export function useConversationActions({
  selectedIds,
  setData,
  setSelectionMode,
  setSelectedIds,
}: ConversationActionParams) {
  const handleMarkRead = useCallback(async () => {
    try {
      for (const id of selectedIds) {
        await chatApi.markAsRead(id);
      }
      setData((prev) =>
        prev.map((m) => (selectedIds.includes(m.id) ? { ...m, unread: 0 } : m)),
      );
      setSelectionMode(false);
      setSelectedIds([]);
    } catch (err) {
      console.error("Mark read error:", err);
    }
  }, [selectedIds, setData, setSelectionMode, setSelectedIds]);

  const handleMarkReadSingle = useCallback(
    async (id: string) => {
      try {
        await chatApi.markAsRead(id);
        setData((prev) =>
          prev.map((m) => (m.id === id ? { ...m, unread: 0 } : m)),
        );
      } catch (err) {
        console.error("Mark read single error:", err);
      }
    },
    [setData],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await chatApi.deleteConversation(id);
        setData((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error("Delete conversation error:", err);
      }
    },
    [setData],
  );

  const handleDeleteSelected = useCallback(async () => {
    try {
      for (const id of selectedIds) {
        await chatApi.deleteConversation(id);
      }
      setData((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      setSelectionMode(false);
      setSelectedIds([]);
    } catch (err) {
      console.error("Delete selected error:", err);
    }
  }, [selectedIds, setData, setSelectionMode, setSelectedIds]);

  const handleMute = useCallback(
    async (id: string, duration: string) => {
      let mutedUntil: Date | null = null;
      const now = new Date();

      if (duration === "Trong 1 giờ") {
        mutedUntil = new Date(now.getTime() + 60 * 60 * 1000);
      } else if (duration === "Trong 4 giờ") {
        mutedUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      } else if (duration === "Đến 8 giờ sáng") {
        mutedUntil = new Date();
        mutedUntil.setHours(8, 0, 0, 0);
        if (mutedUntil <= now) mutedUntil.setDate(mutedUntil.getDate() + 1);
      } else if (duration === "Cho đến khi được mở lại") {
        mutedUntil = new Date("2099-12-31T23:59:59Z");
      }

      try {
        await chatApi.muteConversation(id, mutedUntil);
        setData((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isMuted: true } : m)),
        );
      } catch (err) {
        console.error("Mute error:", err);
      }
    },
    [setData],
  );

  const handleUnmute = useCallback(
    async (id: string) => {
      try {
        await chatApi.muteConversation(id, null);
        setData((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isMuted: false } : m)),
        );
      } catch (err) {
        console.error("Unmute error:", err);
      }
    },
    [setData],
  );

  const handlePin = useCallback(
    async (id: string, pinned: boolean) => {
      try {
        await chatApi.pinConversation(id, pinned);
        setData((prev) => {
          const newData = prev.map((m) =>
            m.id === id ? { ...m, isPinned: pinned } : m,
          );
          return [...newData].sort((a: any, b: any) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.updatedAt - a.updatedAt;
          });
        });
      } catch (err) {
        console.error("Pin error:", err);
      }
    },
    [setData],
  );

  const handleMarkUnread = useCallback(
    async (id: string) => {
      try {
        await chatApi.markAsUnread(id);
        setData((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, unread: Math.max(1, m.unread) } : m,
          ),
        );
      } catch (err) {
        console.error("Mark unread error:", err);
      }
    },
    [setData],
  );

  return {
    handleMarkRead,
    handleMarkReadSingle,
    handleDeleteConversation,
    handleDeleteSelected,
    handleMute,
    handleUnmute,
    handlePin,
    handleMarkUnread,
  };
}
