import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '../context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (action: 'take' | 'library') => void;
};

export default function GroupAvatarPicker({ visible, onClose, onPick }: Props) {
  const { scheme, colors } = useTheme();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  const rowBg = colors.surface;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable 
        style={{ flex: 1, backgroundColor: overlayColor, justifyContent: 'flex-end' }} 
        onPress={onClose}
      >
        <Pressable 
          style={{ 
            backgroundColor: rowBg, 
            borderTopLeftRadius: 12, 
            borderTopRightRadius: 12, 
            paddingHorizontal: 16, 
            paddingTop: 12, 
            paddingBottom: 30 
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, alignSelf: 'center', borderRadius: 2, marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Đổi ảnh nhóm</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => { onPick('take'); onClose(); }} 
            style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingVertical: 14, 
                borderBottomWidth: 1, 
                borderBottomColor: colors.border 
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialIcons name="camera-alt" size={24} color={colors.text} />
            </View>
            <Text style={{ color: colors.text, fontSize: 16 }}>Chụp ảnh mới</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => { onPick('library'); onClose(); }} 
            style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingVertical: 14
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialIcons name="photo-library" size={24} color={colors.text} />
            </View>
            <Text style={{ color: colors.text, fontSize: 16 }}>Chọn ảnh trên máy</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}