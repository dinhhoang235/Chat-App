import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';

type Props = {
  count: number;
  onCancel: () => void;
  onSelectAll: () => void;
};

export default function SelectionHeader({ count, onCancel, onSelectAll }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onCancel} style={{ paddingRight: 12 }}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{count}</Text>
      </View>

      <TouchableOpacity onPress={onSelectAll}>
        <Text style={{ color: colors.tint, fontWeight: '600' }}>Chọn tất cả</Text>
      </TouchableOpacity>
    </View>
  );
}
