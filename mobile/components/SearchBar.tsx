import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onQR: () => void;
  colors: any;
};

export default function SearchBar({ value, onChange, onSubmit, onBack, onQR, colors }: Props) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <MaterialIcons name="arrow-back" color={colors.text} size={24} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, height: 40 }}>
            <MaterialIcons name="search" color={colors.textSecondary} size={20} />

            <TextInput
              placeholder="Tìm kiếm..."
              placeholderTextColor={colors.textSecondary}
              value={value}
              onChangeText={onChange}
              onSubmitEditing={onSubmit}
              style={{ flex: 1, color: colors.text, fontSize: 14, marginLeft: 10 }}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />

          </View>
        </View>

        <TouchableOpacity onPress={onQR} style={{ paddingLeft: 8 }}>
          <MaterialIcons name="qr-code-scanner" color={colors.textSecondary} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
