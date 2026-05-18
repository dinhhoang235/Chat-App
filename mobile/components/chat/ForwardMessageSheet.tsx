import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { chatApi } from "@/services/chat";
import { mapConversationResponse } from "@/utils/conversation";
import { ChatAvatar, GroupAvatar } from "@/components/avatars";

type Props = {
  visible: boolean;
  currentConversationId?: string | number | null;
  onClose: () => void;
  onForward: (conversationIds: string[]) => Promise<void> | void;
};

export default function ForwardMessageSheet({
  visible,
  currentConversationId,
  onClose,
  onForward,
}: Props) {
  const { colors, scheme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const overlayColor =
    scheme === "dark" ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.55)";

  React.useEffect(() => {
    if (!visible || !user) return;

    let mounted = true;
    setSelectedIds([]);
    setLoading(true);
    chatApi
      .getConversations()
      .then((response) => {
        if (!mounted) return;
        const mapped = response.data
          .map((conv: any) => mapConversationResponse(conv, user, colors))
          .filter(
            (conv: any) =>
              conv.id.toString() !== currentConversationId?.toString(),
          );
        setConversations(mapped);
      })
      .catch(() => {
        if (mounted) setConversations([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [visible, user, colors, currentConversationId]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (selectedIds.length === 0 || submitting) return;
    try {
      setSubmitting(true);
      await onForward(selectedIds);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <Pressable
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "72%",
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: colors.surfaceVariant,
              alignSelf: "center",
              borderRadius: 2,
              marginBottom: 12,
            }}
          />
          <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: "700" }}>
              Chuyển tiếp
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <MaterialIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 32 }}>
              <ActivityIndicator color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 380 }}
              ListEmptyComponent={
                <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 24 }}>
                  Không có cuộc trò chuyện phù hợp
                </Text>
              }
              renderItem={({ item }) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => toggle(item.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                    }}
                  >
                    {item.isGroup ? (
                      <GroupAvatar avatars={item.avatars} size={44} membersCount={item.membersCount} />
                    ) : (
                      <ChatAvatar
                        avatar={item.avatar}
                        name={item.name}
                        online={item.status === "online"}
                        size={44}
                        tintColor={item.color || colors.tint}
                        borderColor={colors.surface}
                      />
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                        {item.lastMessage}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={selected ? "check-circle" : "radio-button-unchecked"}
                      size={24}
                      color={selected ? colors.tint : colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <TouchableOpacity
              onPress={submit}
              disabled={selectedIds.length === 0 || submitting}
              style={{
                minHeight: 48,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selectedIds.length === 0 ? colors.surfaceVariant : colors.tint,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: selectedIds.length === 0 ? colors.textSecondary : "#fff", fontWeight: "700", fontSize: 16 }}>
                  Gửi
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
