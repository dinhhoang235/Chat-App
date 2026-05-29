import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  PanResponder,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { chatApi } from "@/services/chat";
import { getFriendsList } from "@/services/friendship";
import { getAvatarUrl } from "@/utils/avatar";
import { mapConversationResponse } from "@/utils/conversation";
import { ChatAvatar, GroupAvatar } from "@/components/avatars";

type Props = {
  visible: boolean;
  currentConversationId?: string | number | null;
  onClose: () => void;
  onForward: (conversationIds: string[]) => Promise<void> | void;
  message?: any;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ForwardMessageSheet({
  visible,
  currentConversationId,
  onClose,
  onForward,
  message,
}: Props) {
  const { colors, scheme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [friends, setFriends] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sendStates, setSendStates] = React.useState<Record<string, "none" | "pending" | "sent">>({});

  const activeTimers = React.useRef<Record<string, NodeJS.Timeout>>({});
  const overlayColor =
    scheme === "dark" ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.55)";

  const translateY = React.useRef(new Animated.Value(0)).current;

  // Clean up all timers on unmount
  React.useEffect(() => {
    return () => {
      Object.values(activeTimers.current).forEach(clearTimeout);
    };
  }, []);

  React.useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    } else {
      // Reset sending states and clear timers when modal is closed
      Object.values(activeTimers.current).forEach(clearTimeout);
      activeTimers.current = {};
      setSendStates({});
    }
  }, [visible, translateY]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  React.useEffect(() => {
    if (!visible || !user) return;

    let mounted = true;
    setLoading(true);
    setQuery("");

    Promise.all([
      chatApi.getConversations().catch(() => ({ data: [] })),
      getFriendsList().catch(() => []),
    ])
      .then(([convResponse, friendsResponse]) => {
        if (!mounted) return;

        const mappedConvs = (convResponse.data || [])
          .map((conv: any) => mapConversationResponse(conv, user, colors))
          .filter(
            (conv: any) =>
              conv.id.toString() !== currentConversationId?.toString(),
          );

        const friendsArray = Array.isArray(friendsResponse)
          ? friendsResponse
          : friendsResponse?.data || [];
        const formattedFriends = friendsArray
          .filter((f: any) => f && (f.friend || f.id))
          .map((f: any) => {
            const userInfo = f.friend || f;
            return {
              id: userInfo.id?.toString() || Math.random().toString(),
              name: userInfo.fullName || "Người dùng",
              phone: userInfo.phone || "",
              avatar: getAvatarUrl(userInfo.avatar),
              color: "#6B7280",
            };
          });

        setConversations(mappedConvs);
        setFriends(formattedFriends);
      })
      .catch((err) => {
        console.error("Error loading forward sheet data:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [visible, user, colors, currentConversationId]);

  const handleSendPress = async (id: string) => {
    const currentState = sendStates[id] || "none";

    if (currentState === "none") {
      // Transition to pending (Hoàn tác)
      setSendStates((prev) => ({ ...prev, [id]: "pending" }));

      // Set undo timer for 3 seconds
      const timerId = setTimeout(async () => {
        try {
          if (id.startsWith("user-")) {
            const targetUserId = parseInt(id.replace("user-", ""), 10);
            if (message) {
              await chatApi.startConversation(
                targetUserId,
                message.content || "",
                undefined,
                message.type || "text",
              );
            }
          } else {
            if (message && message.id) {
              const sourceConversationId = message.conversationId ?? currentConversationId;
              if (sourceConversationId) {
                await chatApi.forwardMessage(
                  sourceConversationId,
                  message.id,
                  [id],
                );
              }
            }
          }
          // Transition to sent
          setSendStates((prev) => ({ ...prev, [id]: "sent" }));
        } catch (err) {
          console.error("Failed to forward message:", err);
          // Revert back to none on error
          setSendStates((prev) => ({ ...prev, [id]: "none" }));
        }
        delete activeTimers.current[id];
      }, 3000);

      activeTimers.current[id] = timerId;
    } else if (currentState === "pending") {
      // Undo action clicked: cancel the timer and revert state to none
      if (activeTimers.current[id]) {
        clearTimeout(activeTimers.current[id]);
        delete activeTimers.current[id];
      }
      setSendStates((prev) => ({ ...prev, [id]: "none" }));
    }
  };

  const flushPendingSends = () => {
    const pendingIds = Object.keys(sendStates).filter((id) => sendStates[id] === "pending");
    if (pendingIds.length === 0) return;

    pendingIds.forEach((id) => {
      // Clear the timer
      if (activeTimers.current[id]) {
        clearTimeout(activeTimers.current[id]);
        delete activeTimers.current[id];
      }

      // Fire off the send request immediately in the background
      (async () => {
        try {
          if (id.startsWith("user-")) {
            const targetUserId = parseInt(id.replace("user-", ""), 10);
            if (message) {
              await chatApi.startConversation(
                targetUserId,
                message.content || "",
                undefined,
                message.type || "text",
              );
            }
          } else {
            if (message && message.id) {
              const sourceConversationId = message.conversationId ?? currentConversationId;
              if (sourceConversationId) {
                await chatApi.forwardMessage(
                  sourceConversationId,
                  message.id,
                  [id],
                );
              }
            }
          }
        } catch (err) {
          console.error("Failed to flush pending send on close:", err);
        }
      })();
    });
  };

  const handleClose = () => {
    flushPendingSends();
    onClose();
  };

  const listData = React.useMemo(() => {
    const directConvMap = new Map<string, string>();
    conversations.forEach((conv) => {
      if (!conv.isGroup && conv.targetUserId) {
        directConvMap.set(conv.targetUserId, conv.id);
      }
    });

    const friendsList = friends.map((friend) => {
      const existingConvId = directConvMap.get(friend.id);
      return {
        id: existingConvId ? existingConvId : `user-${friend.id}`,
        name: friend.name,
        phone: friend.phone,
        avatar: friend.avatar,
        initials: friend.initials,
        isGroup: false,
        userId: friend.id,
        conversationId: existingConvId,
      };
    });

    const groupsList = conversations
      .filter((conv) => conv.isGroup)
      .map((conv) => ({
        id: conv.id,
        name: conv.name,
        avatar: conv.avatar,
        avatars: conv.avatars,
        membersCount: conv.membersCount,
        isGroup: true,
        conversationId: conv.id,
      }));

    const filteredFriends = friendsList.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.phone.toLowerCase().includes(query.toLowerCase()),
    );

    const filteredGroups = groupsList.filter((item) =>
      item.name.toLowerCase().includes(query.toLowerCase()),
    );

    return {
      friends: filteredFriends,
      groups: filteredGroups,
    };
  }, [conversations, friends, query]);

  const flatData = React.useMemo(() => {
    const data: any[] = [];
    if (listData.friends.length > 0) {
      data.push({ type: "header", title: "BẠN BÈ" });
      data.push(...listData.friends.map((f) => ({ ...f, type: "friend" })));
    }
    if (listData.groups.length > 0) {
      data.push({ type: "header", title: "NHÓM CHAT" });
      data.push(...listData.groups.map((g) => ({ ...g, type: "group" })));
    }
    return data;
  }, [listData]);

  // Removed selectedItems memo

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={handleClose}>
        <AnimatedPressable
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "90%",
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateY }],
          }}
          onPress={() => {
            // Absorb touch events inside the sheet to prevent them from bubbling up to backdrop Pressable
          }}
        >
          {/* Handle bar swipe zone */}
          <View
            {...panResponder.panHandlers}
            style={{
              width: "100%",
              paddingTop: 12,
              paddingBottom: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colors.surfaceVariant,
                borderRadius: 2,
              }}
            />
          </View>

          {/* Header Row - OUTSIDE of swipe zone */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: "700" }}>
              Chuyển tiếp
            </Text>
            <TouchableOpacity onPress={handleClose} style={{ padding: 6 }}>
              <MaterialIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.background,
                borderRadius: 10,
                paddingHorizontal: 10,
                height: 40,
                borderWidth: 1,
                borderColor: colors.surfaceVariant,
              }}
            >
              <MaterialIcons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm kiếm bạn bè, nhóm..."
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: colors.text,
                  fontSize: 15,
                  padding: 0,
                }}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} style={{ padding: 4 }}>
                  <MaterialIcons name="cancel" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32 }}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={flatData}
              keyExtractor={(item, index) =>
                item.type === "header" ? `header-${index}` : item.id
              }
              style={{ flex: 1 }}
              ListEmptyComponent={
                <Text
                  style={{
                    color: colors.textSecondary,
                    textAlign: "center",
                    paddingVertical: 24,
                  }}
                >
                  Không tìm thấy bạn bè hoặc nhóm phù hợp
                </Text>
              }
              renderItem={({ item }) => {
                if (item.type === "header") {
                  return (
                    <View
                      style={{
                        backgroundColor: colors.background,
                        paddingHorizontal: 20,
                        paddingVertical: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                          fontWeight: "700",
                          letterSpacing: 0.5,
                        }}
                      >
                        {item.title}
                      </Text>
                    </View>
                  );
                }

                const itemState = sendStates[item.id] || "none";

                let buttonText = "Gửi";
                let buttonBg = colors.tint;
                let buttonTextColor = "#fff";
                let buttonBorderColor = "transparent";
                let buttonDisabled = false;

                if (itemState === "pending") {
                  buttonText = "Hoàn tác";
                  buttonBg = scheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
                  buttonTextColor = colors.textSecondary;
                  buttonBorderColor = colors.border;
                } else if (itemState === "sent") {
                  buttonText = "Đã gửi";
                  buttonBg = scheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)";
                  buttonTextColor = colors.textSecondary;
                  buttonBorderColor = colors.border;
                  buttonDisabled = true;
                }

                return (
                  <TouchableOpacity
                    disabled={buttonDisabled}
                    onPress={() => handleSendPress(item.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                    }}
                  >
                    {item.isGroup ? (
                      <GroupAvatar
                        avatars={item.avatars}
                        size={44}
                        membersCount={item.membersCount}
                      />
                    ) : (
                      <ChatAvatar
                        avatar={item.avatar}
                        name={item.name}
                        size={44}
                        borderColor={colors.surface}
                      />
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {item.isGroup
                          ? `${item.membersCount} thành viên`
                          : item.phone || "Bạn bè"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={buttonDisabled}
                      onPress={() => handleSendPress(item.id)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: buttonBg,
                        borderWidth: buttonBorderColor !== "transparent" ? 1 : 0,
                        borderColor: buttonBorderColor,
                        minWidth: 80,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: buttonTextColor, fontSize: 13, fontWeight: "700" }}>
                        {buttonText}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </AnimatedPressable>
      </Pressable>
    </Modal>
  );
}
