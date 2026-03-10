import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/themeContext';

interface Props {
  visible: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}

export default function ConfirmModal({ visible, title = '', onCancel, onConfirm, confirmText = 'OK' }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={{ flex: 1 }} onPress={onCancel}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{title}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity onPress={onCancel} style={{ padding: 10, marginRight: 8 }}>
                  <Text style={{ color: colors.textSecondary }}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onConfirm} style={{ padding: 10 }}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
