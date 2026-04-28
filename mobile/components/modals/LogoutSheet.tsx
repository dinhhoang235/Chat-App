import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function LogoutSheet({ visible, onClose, onLogout }: Props) {
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

          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, textAlign: 'center', marginBottom: 8 }}>Đăng xuất</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?</Text>

          <TouchableOpacity 
            onPress={() => { onLogout(); onClose(); }} 
            style={{ 
              backgroundColor: colors.danger, 
              paddingVertical: 14, 
              borderRadius: 12, 
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Đăng xuất</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={onClose} 
            style={{ 
              paddingVertical: 14, 
              borderRadius: 12, 
              alignItems: 'center',
              backgroundColor: colors.surfaceVariant
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}
