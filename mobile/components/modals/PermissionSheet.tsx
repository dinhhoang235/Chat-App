import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  options: string[];
  selected?: string;
  onSelect: (opt: string) => void;
};

export default function PermissionSheet({ visible, onClose, title, description, options, selected, onSelect }: Props) {
  const { scheme, colors } = useTheme();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  const rowBg = colors.surface;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: rowBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', borderRadius: 2, marginBottom: 10 }} />

          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 6 }}>{title}</Text>
          {description ? <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>{description}</Text> : null}

          {options.map((opt, idx) => {
            const isLast = idx === options.length - 1;
            const isSelected = selected === opt;
            return (
              <TouchableOpacity key={opt} onPress={() => { onSelect(opt); onClose(); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: isLast ? 'transparent' : colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: colors.text }}>{opt}</Text>
                </View>
                {isSelected ? <MaterialIcons name="check" size={20} color={colors.tint} /> : <View style={{ width: 20 }} />}
              </TouchableOpacity>
            );
          })}

        </View>
      </Pressable>
    </Modal>
  );
}
