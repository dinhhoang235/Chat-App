import { useEffect, useRef } from 'react';
import { FlatList } from 'react-native';

interface UseChatThreadRefsParams {
  messages: any[];
  allMedia: any[];
}

export function useChatThreadRefs({ messages, allMedia }: UseChatThreadRefsParams) {
  const messagesRef = useRef<any[]>([]);
  const allMediaRef = useRef<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    allMediaRef.current = allMedia;
  }, [allMedia]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  return {
    messagesRef,
    allMediaRef,
    flatListRef,
    inputRef,
  };
}
