import { useCallback } from 'react';
import { FlatList } from 'react-native';
import { chatApi } from '@/services/chat';
import { mapThreadMessage } from '@/utils/chatThread';

interface UseChatThreadSendTextParams {
  attachments: { uri: string; name: string; type: string; size?: number }[];
  clearAttachments: () => void;
  setGalleryVisible: (value: boolean) => void;
  messageText: string;
  setMessageText: (value: string) => void;
  handleSendAttachment: (file: {
    uri: string;
    name: string;
    type: string;
    size?: number;
  }) => Promise<void>;
  flatListRef: React.RefObject<FlatList<any> | null>;
  replyingTo: any;
  setReplyingTo: (value: any) => void;
  userId?: number;
  conversationId: string | null;
  isNewConversation: boolean;
  targetUserIdState: string | null;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setCreatingConversation: (value: boolean) => void;
  setConversationId: (value: string | null) => void;
}

export function useChatThreadSendText({
  attachments,
  clearAttachments,
  setGalleryVisible,
  messageText,
  setMessageText,
  handleSendAttachment,
  flatListRef,
  replyingTo,
  setReplyingTo,
  userId,
  conversationId,
  isNewConversation,
  targetUserIdState,
  setMessages,
  setCreatingConversation,
  setConversationId,
}: UseChatThreadSendTextParams) {
  const handleSendText = useCallback(
    async (text: string) => {
      setMessageText('');

      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

      const replyToSnapshot = replyingTo;
      setReplyingTo(null);

      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        content: text,
        fromMe: true,
        senderId: userId,
        createdAt: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: 'sending',
        replyTo: replyToSnapshot,
      };

      try {
        const targetConversationId = conversationId;

        if (isNewConversation && !conversationId) {
          setMessages([tempMessage]);
          setCreatingConversation(true);
          try {
            const response = await chatApi.startConversation(
              Number(targetUserIdState),
              text,
            );
            const conv = response.data;
            const convId = conv.id || conv.conversationId;
            if (convId) {
              setConversationId(convId.toString());
              const lastMessage = conv.messages?.[0];
              if (lastMessage) {
                setMessages([
                  mapThreadMessage(lastMessage, userId, {
                    status: 'sent',
                    includeSeenBy: true,
                  }),
                ]);
              }
            }
            return;
          } catch (err) {
            console.error('Error creating conversation on send:', err);
            setMessages([]);
            setMessageText(text);
            return;
          } finally {
            setCreatingConversation(false);
          }
        }

        setMessages((prev) => [tempMessage, ...prev]);

        const response = await chatApi.sendMessage(
          Number(targetConversationId),
          text,
          'text',
          undefined,
          replyToSnapshot?.id,
          tempId,
        );
        const sentMessage = response.data;

        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === tempId);
          if (idx !== -1) {
            const newMessages = [...prev];
            newMessages[idx] = mapThreadMessage(sentMessage, userId, {
              status: 'sent',
              includeSeenBy: true,
            });
            return newMessages;
          }
          return prev;
        });
      } catch (err) {
        console.error('Send error:', err);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessageText(text);
      }
    },
    [
      setMessageText,
      flatListRef,
      replyingTo,
      setReplyingTo,
      userId,
      conversationId,
      isNewConversation,
      setMessages,
      setCreatingConversation,
      targetUserIdState,
      setConversationId,
    ],
  );

  const sendTextDirect = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await handleSendText(trimmed);
    },
    [handleSendText],
  );

  const handleSend = useCallback(async () => {
    if (attachments.length > 0) {
      setGalleryVisible(false);
      for (const file of attachments) {
        await handleSendAttachment(file);
      }
      clearAttachments();
      return;
    }

    if (!messageText.trim()) return;
    await handleSendText(messageText.trim());
  }, [
    attachments,
    setGalleryVisible,
    handleSendAttachment,
    clearAttachments,
    messageText,
    handleSendText,
  ]);

  return {
    handleSend,
    sendTextDirect,
    handleSendText,
  };
}
