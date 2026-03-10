import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/themeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onLeave: () => void;
}

export default function LeaveGroupSheet({ visible, onClose, onLeave }: Props) {
  const { colors, scheme } = useTheme();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', borderRadius: 2, marginBottom: 8 }} />

          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, textAlign: 'center' }}>Rời nhóm và xóa trò chuyện này?</Text>

          <TouchableOpacity onPress={() => { onLeave(); }} style={{ paddingVertical: 16, alignItems: 'center', borderTopWidth: 12, borderTopColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 12 }}>
            <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 16 }}>Rời nhóm</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
