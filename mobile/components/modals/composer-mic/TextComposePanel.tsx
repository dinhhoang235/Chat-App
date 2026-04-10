import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import type { ComposerMicColors } from './types';

type Props = {
  colors: ComposerMicColors;
  isDictating: boolean;
  dictationText: string;
  dictationError: string | null;
  onClear: () => void;
  onSubmit: () => void;
  onEdit: () => void;
};

export default function TextComposePanel({
  colors,
  isDictating,
  dictationText,
  dictationError,
  onClear,
  onSubmit,
  onEdit,
}: Props) {
  return (
    <View className="px-4 pt-[18px] pb-[22px]" style={{ backgroundColor: colors.surface }}>
      <View className="items-center py-[10px]">
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
          {isDictating ? 'Đang lắng nghe...' : 'Đã dừng nghe'}
        </Text>
        <Text className="mt-2" style={{ color: colors.textSecondary, fontSize: 14 }} numberOfLines={2}>
          {dictationText || 'Nói để nhập văn bản'}
        </Text>
        {dictationError ? (
          <Text className="mt-1.5" style={{ color: '#FF8F8F', fontSize: 13 }} numberOfLines={2}>
            {dictationError}
          </Text>
        ) : null}
      </View>

      <View className="mt-[26px] flex-row items-end justify-around">
        <TouchableOpacity
          onPress={onClear}
          className="w-[72px] items-center"
        >
          <MaterialIcons name="delete" size={28} color={colors.textSecondary} />
          <Text className="mt-2" style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Xóa</Text>
        </TouchableOpacity>

        <View className="w-[88px] items-center">
          <TouchableOpacity
            onPress={onSubmit}
            className="h-[78px] w-[78px] items-center justify-center rounded-full"
            style={{ backgroundColor: '#0A67E8' }}
          >
            <AntDesign name="send" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="mt-2" style={{ color: colors.text, fontSize: 17 }}>Gửi</Text>
        </View>

        <TouchableOpacity
          onPress={onEdit}
          className="w-[88px] items-center"
        >
          <MaterialIcons name="edit" size={28} color={colors.textSecondary} />
          <Text numberOfLines={1} className="mt-2" style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Chỉnh sửa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
