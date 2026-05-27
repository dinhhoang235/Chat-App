import { useEffect, useRef } from "react";

interface UseChatThreadRefsParams {
  messages: any[];
  allMedia: any[];
}

export function useChatThreadRefs({
  messages,
  allMedia,
}: UseChatThreadRefsParams) {
  const messagesRef = useRef<any[]>([]);
  const allMediaRef = useRef<any[]>([]);
  const flatListRef = useRef<any>(null);
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
