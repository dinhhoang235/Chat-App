import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  rightNode?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  titleColor?: string;
  iconColor?: string;
  bottomBorder?: boolean; // control underline
}

export default function ChatOptionRow({ icon, title, subtitle, rightNode, onPress, showChevron = false, titleColor, iconColor, bottomBorder = true }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      className="py-4 flex-row items-center justify-between"
      style={{
        paddingLeft: 8,
        paddingRight: 16,
        borderBottomWidth: bottomBorder ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <View className="flex-row items-center">
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surfaceVariant }}>
          <MaterialIcons name={icon as any} size={20} color={iconColor ?? colors.textSecondary} />
        </View>
        <View style={{ justifyContent: 'center' }}>
          <Text style={{ color: titleColor ?? colors.text, fontWeight: '600' }}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {rightNode}
        {showChevron && (
          <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
}
