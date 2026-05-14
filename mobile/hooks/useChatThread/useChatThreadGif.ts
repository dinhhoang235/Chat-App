import { useCallback, useState } from "react";
import { FlatList } from "react-native";
import { chatApi } from "@/services/chat";
import type { GiphyGif } from "@/services/giphy";
import { mapThreadMessage } from "@/utils/chatThread";

type UseChatThreadGifParams = {
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
};

export function useChatThreadGif({
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
}: UseChatThreadGifParams) {
  const [isSendingGif, setIsSendingGif] = useState(false);

  const handleSendGif = useCallback(
    async (gif: GiphyGif) => {
      if (!gif || isSendingGif) return;

      setIsSendingGif(true);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

      const replyToSnapshot = replyingTo;
      setReplyingTo(null);

      const tempId = `temp-gif-${Date.now()}`;
      const fileInfo = {
        url: gif.url,
        name: `${gif.id}.gif`,
        size: gif.size,
        mime: "image/gif",
        width: gif.width,
        height: gif.height,
        previewUrl: gif.previewUrl,
        source: "giphy",
        giphyId: gif.id,
      };
      const content = JSON.stringify(fileInfo);
      const tempMessage = {
        id: tempId,
        content,
        type: "image",
        fileInfo,
        fromMe: true,
        senderId: userId,
        createdAt: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "sending",
        replyTo: replyToSnapshot,
      };

      try {
        if (isNewConversation && !conversationId) {
          setMessages([tempMessage]);
          setCreatingConversation(true);

          const response = await chatApi.startConversation(
            Number(targetUserIdState),
            content,
            undefined,
            "image",
          );
          const conv = response.data;
          const convId = conv.id || conv.conversationId;
          if (convId) {
            setConversationId(convId.toString());
            const lastMessage = conv.messages?.[0];
            if (lastMessage) {
              setMessages([
                mapThreadMessage(lastMessage, userId, {
                  status: "sent",
                  includeSeenBy: true,
                }),
              ]);
            }
          }
          return;
        }

        if (!conversationId) return;

        setMessages((prev) => [tempMessage, ...prev]);

        const response = await chatApi.sendMessage(
          Number(conversationId),
          content,
          "image",
          undefined,
          replyToSnapshot?.id,
          tempId,
        );

        setMessages((prev) => {
          const idx = prev.findIndex((message) => message.id === tempId);
          if (idx === -1) return prev;

          const next = [...prev];
          next[idx] = mapThreadMessage(response.data, userId, {
            status: "sent",
            includeSeenBy: true,
          });
          return next;
        });
      } catch (error) {
        console.error("GIF send error:", error);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId ? { ...message, status: "error" } : message,
          ),
        );
      } finally {
        setCreatingConversation(false);
        setIsSendingGif(false);
      }
    },
    [
      conversationId,
      flatListRef,
      isNewConversation,
      isSendingGif,
      replyingTo,
      setConversationId,
      setCreatingConversation,
      setMessages,
      setReplyingTo,
      targetUserIdState,
      userId,
    ],
  );

  return { handleSendGif, isSendingGif };
}
