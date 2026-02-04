import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  history: string[];
  onSelect: (s: string) => void;
  onRemove: (s: string) => void;
  onClear: () => void;
  colors: any;
};

export default function SearchHistory({ history, onSelect, onRemove, onClear, colors }: Props) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Lịch sử tìm kiếm</Text>
        <TouchableOpacity onPress={onClear} style={{ padding: 8 }}>
          <MaterialIcons name="delete" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {history.map((h) => (
        <View key={h} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelect(h)}>
            <Text style={{ color: colors.text }}>{h}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onRemove(h)} style={{ paddingLeft: 12 }}>
            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
