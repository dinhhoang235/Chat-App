import React, { useState } from 'react';
import { Modal, Pressable, View, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialBlockMessages?: boolean;
  initialBlockCalls?: boolean;
  onSave: (blockMessages: boolean, blockCalls: boolean) => void;
};

export default function BlockSettingsModal({ visible, onClose, initialBlockMessages = false, initialBlockCalls = false, onSave }: Props) {
  const [blockMessages, setBlockMessages] = useState<boolean>(initialBlockMessages);
  const [blockCalls, setBlockCalls] = useState<boolean>(initialBlockCalls);
  const { scheme, colors } = useTheme();
  const rowBg = colors.surface;

  React.useEffect(() => {
    if (visible) {
      setBlockMessages(initialBlockMessages);
      setBlockCalls(initialBlockCalls);
    }
  }, [visible, initialBlockMessages, initialBlockCalls]);

  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: rowBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', borderRadius: 2, marginBottom: 8 }} />

          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' }}>Quản lý chặn</Text>
          </View>

          <TouchableOpacity onPress={() => setBlockMessages(prev => !prev)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="chat" size={22} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: colors.text }}>Chặn tin nhắn</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>Khi chặn tin nhắn, cả hai sẽ không thể nhắn tin cho nhau.</Text>
              </View>
            </View>
            {blockMessages ? <MaterialIcons name="check-circle" size={24} color={colors.tint} /> : <MaterialIcons name="radio-button-unchecked" size={24} color={colors.textSecondary} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setBlockCalls(prev => !prev)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="call" size={22} color={colors.textSecondary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: colors.text }}>Chặn cuộc gọi</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>Khi chặn cuộc gọi, cả hai sẽ không thể gọi cho nhau.</Text>
              </View>
            </View>
            {blockCalls ? <MaterialIcons name="check-circle" size={24} color={colors.tint} /> : <MaterialIcons name="radio-button-unchecked" size={24} color={colors.textSecondary} />}
          </TouchableOpacity>

          <View style={{ paddingTop: 12 }} />

          <TouchableOpacity onPress={() => { onSave(blockMessages, blockCalls); onClose(); }} style={{ backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Lưu</Text>
          </TouchableOpacity>

        </View>
      </Pressable>
    </Modal>
  );
}
