import { useCallback, useState } from "react";
import { Alert, FlatList, Linking } from "react-native";
import * as Location from "expo-location";
import { chatApi } from "@/services/chat";
import { socketService } from "@/services/socket";
import { mapThreadMessage } from "@/utils/chatThread";

interface UseChatThreadLocationParams {
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

export function useChatThreadLocation({
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
}: UseChatThreadLocationParams) {
  const [isSendingLocation, setIsSendingLocation] = useState(false);

  const replaceTempMessage = useCallback(
    (tempId: string, message: any) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === tempId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = mapThreadMessage(message, userId, {
          status: "sent",
          includeSeenBy: true,
        });
        return next;
      });
    },
    [setMessages, userId],
  );

  const markTempMessageError = useCallback(
    (tempId: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m)),
      );
    },
    [setMessages],
  );

  const showPermissionAlert = useCallback(() => {
    Alert.alert(
      "Can quyen vi tri",
      "Vui long cap quyen truy cap vi tri trong Settings de chia se vi tri hien tai.",
      [
        { text: "Huy", style: "cancel" },
        { text: "Mo Settings", onPress: () => Linking.openSettings() },
      ],
    );
  }, []);

  const handleSendLocation = useCallback(async () => {
    if (isSendingLocation) return;

    setIsSendingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        showPermissionAlert();
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationContent = JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

      const replyToSnapshot = replyingTo;
      setReplyingTo(null);

      const tempId = `temp-location-${Date.now()}`;
      const tempMessage = {
        id: tempId,
        content: locationContent,
        type: "location",
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

      if (isNewConversation && !conversationId) {
        setMessages([tempMessage]);
        setCreatingConversation(true);
        try {
          const response = await chatApi.startConversation(
            Number(targetUserIdState),
            locationContent,
            undefined,
            "location",
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
        } catch (err) {
          console.error("Error creating conversation on location send:", err);
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m)),
          );
        } finally {
          setCreatingConversation(false);
        }
        return;
      }

      if (!conversationId) return;

      setMessages((prev) => [tempMessage, ...prev]);

      const sendViaRest = async () => {
        const response = await chatApi.sendMessage(
          Number(conversationId),
          locationContent,
          "location",
          undefined,
          replyToSnapshot?.id,
          tempId,
        );
        replaceTempMessage(tempId, response.data);
      };

      if (!socketService.isConnected()) {
        await sendViaRest();
        return;
      }

      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        sendViaRest().catch((err) => {
          console.error("Send location REST fallback error:", err);
          markTempMessageError(tempId);
        });
      }, 5000);

      socketService.emit(
        "send_message",
        {
          conversationId,
          type: "LOCATION",
          content: locationContent,
          replyToId: replyToSnapshot?.id,
          tempId,
        },
        (response: any) => {
          if (settled) return;
          settled = true;
          clearTimeout(fallbackTimer);

          if (response?.error) {
            sendViaRest().catch((err) => {
              console.error("Send location REST fallback error:", err);
              markTempMessageError(tempId);
            });
            return;
          }

          if (response?.message) {
            replaceTempMessage(tempId, response.message);
            return;
          }

          markTempMessageError(tempId);
        },
      );
    } catch (err) {
      console.error("Send location error:", err);
      Alert.alert("Loi", "Khong the lay vi tri hien tai. Vui long thu lai.");
    } finally {
      setIsSendingLocation(false);
    }
  }, [
    conversationId,
    flatListRef,
    isNewConversation,
    isSendingLocation,
    markTempMessageError,
    replaceTempMessage,
    replyingTo,
    setConversationId,
    setCreatingConversation,
    setMessages,
    setReplyingTo,
    showPermissionAlert,
    targetUserIdState,
    userId,
  ]);

  return {
    handleSendLocation,
    isSendingLocation,
  };
}
