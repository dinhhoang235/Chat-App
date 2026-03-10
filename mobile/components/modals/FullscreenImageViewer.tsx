import React, { useEffect, useState } from 'react';
import { Modal, View, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

export default function FullscreenImageViewer({ visible, images, initialIndex = 0, onClose }: Props) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/95 justify-center items-center">
        <View className="w-full h-full justify-center items-center">
          <Image source={{ uri: images[index] }} className="w-full h-[80%]" resizeMode="contain" />

          <TouchableOpacity className="absolute top-4 left-4 p-2 bg-black/50 rounded-full" onPress={onClose} activeOpacity={0.8}>
            <MaterialIcons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

