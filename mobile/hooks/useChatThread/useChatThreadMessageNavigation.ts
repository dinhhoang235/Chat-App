import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';

interface UseChatThreadMessageNavigationParams {
  processedMessages: any[];
  flatListRef: React.RefObject<FlatList<any> | null>;
}

export function useChatThreadMessageNavigation({
  processedMessages,
  flatListRef,
}: UseChatThreadMessageNavigationParams) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const scrollToMessageId = useCallback(
    (messageId: string) => {
      const targetId = messageId.toString();
      const idx = processedMessages.findIndex(
        (m) => m.id?.toString() === targetId,
      );

      if (idx !== -1) {
        flatListRef.current?.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedMessageId(targetId);
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 2000);
      } else {
        console.log('Message not found in current list:', targetId);
      }
    },
    [processedMessages, flatListRef],
  );

  return {
    highlightedMessageId,
    scrollToMessageId,
  };
}
