import { useState, useRef, useEffect, useCallback } from 'react';
import { socketService } from '@/services/socket';

export const useTyping = (conversationId: string | null, userId: number | undefined) => {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<{ id: number, avatar?: string } | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEventRef = useRef<number>(0);

  // Listen for typing events from other users
  useEffect(() => {
    if (!conversationId) return;
    const conversationIdNum = parseInt(conversationId, 10);

    const handleStart = (data: any) => {
      if (data.conversationId === conversationIdNum && data.userId !== userId) {
        setIsTyping(true);
        setTypingUser({ id: data.userId, avatar: data.avatar });
      }
    };

    const handleStop = (data: any) => {
      if (data.conversationId === conversationIdNum && data.userId !== userId) {
        setIsTyping(false);
        setTypingUser(null);
      }
    };

    socketService.on('user_typing_start', handleStart);
    socketService.on('user_typing_stop', handleStop);

    return () => {
      socketService.off('user_typing_start', handleStart);
      socketService.off('user_typing_stop', handleStop);
    };
  }, [conversationId, userId]);

  // Function to call when current user is typing
  const handleType = useCallback(() => {
    if (!conversationId) return;

    const now = Date.now();
    // Throttle typing events: only send every 2 seconds
    if (now - lastTypingEventRef.current > 2000) {
      socketService.emit('typing_start', parseInt(conversationId, 10));
      lastTypingEventRef.current = now;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to send stop typing event after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (conversationId) {
        socketService.emit('typing_stop', parseInt(conversationId, 10));
      }
    }, 3000);
  }, [conversationId]);

  return { isTyping, typingUser, handleType };
};
