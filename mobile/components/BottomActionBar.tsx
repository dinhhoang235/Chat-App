import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/themeContext';

type Props = {
  onMarkRead: () => void;
  onDelete: () => void;
};

export default function BottomActionBar({ onMarkRead, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const { scheme, colors } = useTheme();

  return (
    <View style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      borderTopColor: scheme === 'dark' ? colors.surface : '#E5E7EB',
      backgroundColor: scheme === 'dark' ? colors.surface : '#fff',
      paddingTop: 10,
      paddingBottom: 10 + insets.bottom,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <TouchableOpacity
        onPress={onMarkRead}
        style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="drafts" size={20} color={scheme === 'dark' ? '#E5E7EB' : '#111827'} />
        <Text style={{ fontSize: 12, color: scheme === 'dark' ? '#E5E7EB' : '#111827', marginTop: 6 }}>Đánh dấu đã đọc</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDelete}
        style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="delete" size={20} color="#DC2626" />
        <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>Xóa</Text>
      </TouchableOpacity>
    </View>
  );
}
