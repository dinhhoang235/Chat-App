import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onDeleteForMe: () => void;
  onUnsend: () => void;
}

export default function DeleteMessageSheet({ visible, onClose, onDeleteForMe, onUnsend }: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ 
          position: 'absolute', 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: colors.surface, 
          borderTopLeftRadius: 20, 
          borderTopRightRadius: 20, 
          paddingHorizontal: 20, 
          paddingTop: 12, 
          paddingBottom: Math.max(insets.bottom, 24) 
        }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', borderRadius: 2, marginBottom: 16 }} />

          <TouchableOpacity 
            onPress={() => { onUnsend(); onClose(); }} 
            style={styles.button}
          >
            <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 16 }}>Thu hồi với mọi người</Text>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: colors.border, width: '100%' }} />

          <TouchableOpacity 
            onPress={() => { onDeleteForMe(); onClose(); }} 
            style={styles.button}
          >
            <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 16 }}>Thu hồi với bạn</Text>
          </TouchableOpacity>

          <View style={{ height: 8 }} />

          <TouchableOpacity 
            onPress={onClose} 
            style={[styles.button, { backgroundColor: colors.surfaceVariant, borderRadius: 12 }]}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
