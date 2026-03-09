import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface QuickActionsProps {
  isGroup: boolean;
  isMuted: boolean;
  onSearch: () => void;
  onAddMember?: () => void;
  onToggleMute: () => void;
  colors: any;
}

export const QuickActions = ({
  isGroup,
  isMuted,
  onSearch,
  onAddMember,
  onToggleMute,
  colors,
}: QuickActionsProps) => {
  return (
    <View className="px-4 py-4 flex-row items-center justify-around">
      <TouchableOpacity className="items-center" onPress={onSearch}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <MaterialIcons name="search" size={20} color={colors.text} />
        </View>
        <Text style={{ color: colors.text }}>Tìm tin nhắn</Text>
      </TouchableOpacity>

      {isGroup && (
        <TouchableOpacity className="items-center" onPress={onAddMember}>
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
    </View>
  );
};
