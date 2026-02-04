import React from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '../context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  type: 'avatar' | 'cover';
  onPick: (action: 'take' | 'library' | 'zstyle' | 'choose-old') => void;
};

export default function ImagePickerModal({ visible, onClose, type, onPick }: Props) {
  const { scheme, colors } = useTheme();
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  const rowBg = colors.surface;
  const title = type === 'avatar' ? 'Chọn ảnh đại diện' : 'Chọn ảnh bìa';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: rowBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
          <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', borderRadius: 2, marginBottom: 8 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => { onPick('take'); onClose(); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <MaterialIcons name="camera-alt" size={20} color={colors.text} style={{ marginRight: 12 }} />
            <Text style={{ color: colors.text }}>Chụp ảnh mới</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { onPick('library'); onClose(); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <MaterialIcons name="photo-library" size={20} color={colors.text} style={{ marginRight: 12 }} />
            <Text style={{ color: colors.text }}>Chọn ảnh trên máy</Text>
          </TouchableOpacity>

        </View>
      </Pressable>
    </Modal>
  );
}
