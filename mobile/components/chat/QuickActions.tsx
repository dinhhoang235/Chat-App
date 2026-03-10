import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AddToGroupModal } from '@/components/modals';
import { chatApi } from '@/services/chat';

interface QuickActionsProps {
  conversationId: string | number;
  isGroup: boolean;
  isMuted: boolean;
  onSearch: () => void;
  onToggleMute: () => void;
  onMemberAdded?: () => void;
  colors: any;
}

const QuickActions = ({
  conversationId,
  isGroup,
  isMuted,
  onSearch,
  onToggleMute,
  onMemberAdded,
  colors,
}: QuickActionsProps) => {
  const [addModalVisible, setAddModalVisible] = useState(false);

  const addMembers = async (selectedIds: (string | number)[]) => {
    try {
      // @ts-ignore - chatApi is imported from services/api incorrectly in my head or something? 
      // Wait, chat.ts is where chatApi is defined.
      await chatApi.addMembers(conversationId, selectedIds);
      Alert.alert('Thành công', 'Đã thêm thành viên vào nhóm');
      onMemberAdded?.();
    } catch (err) {
      console.error('Add members error:', err);
      Alert.alert('Lỗi', 'Không thể thêm thành viên');
    }
  };

  return (
    <View className="px-4 py-4 flex-row items-center justify-around">
      <TouchableOpacity className="items-center" onPress={onSearch}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <MaterialIcons name="search" size={20} color={colors.text} />
        </View>
        <Text style={{ color: colors.text }}>Tìm tin nhắn</Text>
      </TouchableOpacity>

      {isGroup && (
        <TouchableOpacity className="items-center" onPress={() => setAddModalVisible(true)}>
          <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <MaterialIcons name="person-add" size={20} color={colors.text} />
          </View>
          <Text style={{ color: colors.text }}>Thêm thành viên</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity className="items-center" onPress={onToggleMute}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: isMuted ? colors.tint : colors.surface, borderWidth: 1, borderColor: isMuted ? colors.tint : colors.border }}>
          <MaterialIcons name="notifications-off" size={20} color={isMuted ? '#fff' : colors.text} />
        </View>
        <Text style={{ color: colors.text }}>{isMuted ? 'Đã tắt' : 'Tắt thông báo'}</Text>
      </TouchableOpacity>

      <AddToGroupModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={addMembers}
        conversationId={conversationId.toString()}
      />
    </View>
  );
};

export default QuickActions;
