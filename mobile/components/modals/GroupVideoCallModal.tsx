import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';
import { useAuth } from '@/context/authContext';
import { chatApi } from '@/services/chat';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';

type GroupMember = {
  id: number;
  fullName: string;
  avatar?: string;
};

type Props = {
  visible: boolean;
  conversationId: string | number;
  onClose: () => void;
  onStart: (members: GroupMember[]) => void;
};

const MAX_GROUP_CALL_MEMBERS = 7;

export default function GroupVideoCallModal({
  visible,
  conversationId,
  onClose,
  onStart,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const fetchMembers = async () => {
      try {
        setLoading(true);
        setQuery('');
        setSelectedIds([]);

        const response = await chatApi.getConversationDetails(conversationId);
        const participants = response?.data?.participants || [];

        const mapped: GroupMember[] = participants
          .map((p: any) => {
            const member = p?.user;
            if (!member?.id) return null;
            return {
              id: Number(member.id),
              fullName: member.fullName || 'Người dùng',
              avatar: member.avatar || undefined,
            };
          })
          .filter(Boolean)
          .filter((m: GroupMember) => m.id !== Number(user?.id));

        if (!cancelled) {
          setMembers(mapped);
        }
      } catch (error) {
        console.error('Fetch group members for video call failed:', error);
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMembers();

    return () => {
      cancelled = true;
    };
  }, [visible, conversationId, user?.id]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.fullName.toLowerCase().includes(q));
  }, [members, query]);

  const selectedMembers = useMemo(() => {
    const idSet = new Set(selectedIds);
    return members.filter((m) => idSet.has(m.id));
  }, [members, selectedIds]);

  const toggleMember = (memberId: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      if (prev.length >= MAX_GROUP_CALL_MEMBERS) {
        return prev;
      }
      return [...prev, memberId];
    });
  };

  const canStart = selectedMembers.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1">
          <View className="flex-row items-center px-4 pt-1 pb-2.5">
            <TouchableOpacity onPress={onClose} className="mr-2">
              <MaterialIcons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
              Chọn người tham gia
            </Text>
          </View>

          <View className="px-4">
            <View
              className="flex-row items-center rounded-xl px-3 h-10"
              style={{
                backgroundColor: colors.surfaceVariant,
              }}
            >
              <MaterialIcons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm tên"
                placeholderTextColor={colors.textSecondary}
                className="ml-2 flex-1 text-base"
                style={{ color: colors.text }}
              />
            </View>

            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '700',
                marginTop: 12,
                marginBottom: 6,
              }}
            >
              Thành viên nhóm ({filteredMembers.length})
            </Text>
          </View>

          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 170 }}
              renderItem={({ item }) => {
                const selected = selectedIds.includes(item.id);
                const avatarUrl = getAvatarUrl(item.avatar);
                const initials = getInitials(item.fullName, item.id.toString());

                return (
                  <TouchableOpacity
                    onPress={() => toggleMember(item.id)}
                    className="flex-row items-center py-2"
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center mr-3"
                      style={{
                        backgroundColor: selected ? '#0A84FF' : colors.surfaceVariant,
                        borderWidth: selected ? 0 : 1,
                        borderColor: colors.border,
                      }}
                    >
                      {selected ? <MaterialIcons name="check" size={22} color="#fff" /> : null}
                    </View>

                    <View
                      className="w-[46px] h-[46px] rounded-full overflow-hidden items-center justify-center mr-3"
                      style={{
                        backgroundColor: avatarUrl ? colors.surfaceVariant : colors.tint,
                      }}
                    >
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={{ width: 54, height: 54 }} />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
                      )}
                    </View>

                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <View
            className="absolute left-0 right-0 bottom-0 px-4 pt-3"
            style={{
              backgroundColor: colors.header,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 8 }}>
              Đã chọn: {selectedMembers.length}/{MAX_GROUP_CALL_MEMBERS}
            </Text>

            <FlatList
              data={selectedMembers}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
              renderItem={({ item }) => {
                const avatarUrl = getAvatarUrl(item.avatar);
                const initials = getInitials(item.fullName, item.id.toString());
                return (
                  <View className="mr-2.5 relative">
                    <View
                      className="w-[50px] h-[50px] rounded-full overflow-hidden items-center justify-center"
                      style={{
                        backgroundColor: avatarUrl ? colors.surfaceVariant : colors.tint,
                      }}
                    >
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={{ width: 50, height: 50 }} />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => toggleMember(item.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <MaterialIcons name="close" size={12} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />

            <TouchableOpacity
              disabled={!canStart}
              onPress={() => {
                onStart(selectedMembers);
                onClose();
              }}
              className="h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: canStart ? '#0A84FF' : colors.surfaceVariant,
              }}
            >
              <Text style={{ color: canStart ? '#fff' : colors.textSecondary, fontSize: 15, fontWeight: '700' }}>
                Bắt đầu gọi nhóm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
