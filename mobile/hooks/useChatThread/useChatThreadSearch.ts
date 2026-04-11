import { useEffect, useMemo, useState } from 'react';
import { useSearch } from '@/context/searchContext';
import { chatApi } from '@/services/chat';

type UseChatThreadSearchArgs = {
  conversationId: string | null;
  processedMessages: any[];
  isFocused: boolean;
  chatId: string | string[] | undefined;
  initialSearch?: boolean;
};

export function useChatThreadSearch({
  conversationId,
  processedMessages,
  isFocused,
  chatId,
  initialSearch = false,
}: UseChatThreadSearchArgs) {
  const { openFor, close } = useSearch();
  const [searchMode, setSearchMode] = useState<boolean>(initialSearch);
  const [searchQuery, setSearchQuery] = useState('');
  const [resultIndices, setResultIndices] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);

  useEffect(() => {
    if (openFor && openFor === chatId) {
      if (isFocused) {
        setSearchMode(true);
        setPendingOpen(false);
      } else {
        setPendingOpen(true);
      }
    }
  }, [openFor, chatId, isFocused]);

  useEffect(() => {
    if (isFocused && pendingOpen) {
      setSearchMode(true);
      setPendingOpen(false);
    }
  }, [isFocused, pendingOpen]);

  useEffect(() => {
    if (!searchMode && openFor === chatId) {
      close();
    }
  }, [searchMode, openFor, chatId, close]);

  useEffect(() => {
    if (!searchMode || !searchQuery.trim()) {
      setResultIndices([]);
      setCurrentResultIndex(0);
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await chatApi.searchMessages(Number(conversationId), searchQuery);
        const results = response.data;
        setSearchResults(results);
        setCurrentResultIndex(0);
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode, conversationId]);

  const currentResultIndices = useMemo(() => {
    if (!searchQuery.trim() || !searchResults.length) return [];
    const indicesSet = new Set<number>();

    searchResults.forEach((res: any) => {
      const idx = processedMessages.findIndex(message => {
        if (message.id === res.id) return true;
        if (message.type === 'image_group' && (message as any).images) {
          return (message as any).images.some((img: any) => img.id === res.id);
        }
        return false;
      });

      if (idx !== -1) indicesSet.add(idx);
    });

    return Array.from(indicesSet).sort((a, b) => a - b);
  }, [searchQuery, searchResults, processedMessages]);

  return {
    searchMode,
    setSearchMode,
    searchQuery,
    setSearchQuery,
    resultIndices,
    setResultIndices,
    currentResultIndex,
    setCurrentResultIndex,
    searchResults,
    setSearchResults,
    currentResultIndices,
  };
}
