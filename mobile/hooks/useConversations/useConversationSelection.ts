import { useState, useCallback } from "react";
import { useSelection } from "@/context/selectionContext";

export function useConversationSelection(data: any[]) {
  const { selectionMode, setSelectionMode } = useSelection();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [startChatVisible, setStartChatVisible] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(data.map((item: any) => item.id));
  }, [data]);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, [setSelectionMode]);

  return {
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    startChatVisible,
    setStartChatVisible,
    toggleSelect,
    handleSelectAll,
    handleCancelSelection,
  };
}
