import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, View, TouchableOpacity } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';

type EmojiSheetProps = {
  visible: boolean;
  onClose: () => void;
  onEmojiSelected: (emoji: any) => void;
  onBackspacePress?: () => void;
  height?: number;
};

export default function EmojiSheet({
  visible,
  onClose,
  onEmojiSelected,
  onBackspacePress,
  height,
}: EmojiSheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const snapPoints = useMemo(() => {
    const h = height ?? Math.round(Dimensions.get('window').height * 0.45);
    return [h];
  }, [height]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      handleComponent={null}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      enableDynamicSizing={false}
      containerStyle={{ pointerEvents: 'box-none' }}
    >
      <View className="flex-1">
        <EmojiKeyboard
          onEmojiSelected={onEmojiSelected}
          categoryPosition="top"
          theme={{
            container: colors.surface,
            header: colors.text,
            search: {
              background: colors.surfaceVariant,
              text: colors.text,
              placeholder: colors.textSecondary,
              icon: colors.icon,
            },
            category: {
              icon: colors.icon,
              iconActive: colors.tint,
              container: colors.surface,
              containerActive: colors.surfaceVariant,
            },
          }}
          styles={{
            container: {
              flex: 1,
              borderRadius: 0,
            },
          }}
        />
        
        {/* Nút Xóa (Backspace) dùng NativeWind */}
        {onBackspacePress && (
          <TouchableOpacity
            onPress={onBackspacePress}
            activeOpacity={0.7}
            className="absolute right-4 bottom-10 w-12 h-12 rounded-full justify-center items-center elevation-5 z-50 shadow-black"
            style={{ 
              backgroundColor: colors.surfaceVariant,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <MaterialIcons name="backspace" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </BottomSheet>
  );
}
