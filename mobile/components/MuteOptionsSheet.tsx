import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  options: string[];
  onSelect: (opt: string) => void;
};

export default function MuteOptionsSheet({ visible, onClose, onOpenSettings, options, onSelect }: Props) {
  const { scheme, colors } = useTheme();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  const rowBg = scheme === 'dark' ? colors.surface : '#fff';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: rowBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
          <View style={{ width: 40, height: 4, backgroundColor: scheme === 'dark' ? colors.surfaceVariant : '#E5E7EB', alignSelf: 'center', borderRadius: 2, marginBottom: 8 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: scheme === 'dark' ? '#fff' : '#111827' }}>Tắt thông báo tin nhắn</Text>
            <TouchableOpacity onPress={onOpenSettings}>
              <MaterialIcons name="settings" size={20} color={scheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          {options.map((opt, idx) => {
            const isLast = idx === options.length - 1;
            return (
              <TouchableOpacity key={opt} onPress={() => { onSelect(opt); onClose(); }} style={{ paddingVertical: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: isLast ? 'transparent' : (scheme === 'dark' ? colors.surfaceVariant : '#E5E7EB') }}>
                <Text style={{ fontSize: 15, color: scheme === 'dark' ? '#E5E7EB' : '#111827' }}>{opt}</Text>
              </TouchableOpacity>
            );
          })}

        </View>
      </Pressable>
    </Modal>
  );
}
