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
  const { scheme, colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: scheme === 'dark' ? colors.surface : '#F3F4F6' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onCancel} style={{ paddingRight: 12 }}>
          <MaterialIcons name="close" size={24} color={scheme === 'dark' ? '#fff' : '#111827'} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: scheme === 'dark' ? '#fff' : '#0F172A' }}>{count}</Text>
      </View>

      <TouchableOpacity onPress={onSelectAll}>
        <Text style={{ color: '#2563EB', fontWeight: '600' }}>Chọn tất cả</Text>
      </TouchableOpacity>
    </View>
  );
}
