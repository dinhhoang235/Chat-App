import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';

type Props = {
  onMarkRead: () => void;
  onDelete: () => void;
  /** Optional callback to report measured height (including safe area) */
  onLayout?: (height: number) => void;
};

export default function BottomActionBar({ onMarkRead, onDelete, onLayout }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View onLayout={(e) => onLayout && onLayout(e.nativeEvent.layout.height)} style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
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
        <MaterialIcons name="drafts" size={20} color={colors.text} />
        <Text style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>Đánh dấu đã đọc</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDelete}
        style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="delete" size={20} color={colors.danger} />
        <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>Xóa</Text>
      </TouchableOpacity>
    </View>
  );
}
