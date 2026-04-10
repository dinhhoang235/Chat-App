import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ComposeMode, ComposerMicColors } from './types';

type Props = {
  colors: ComposerMicColors;
  composeMode: ComposeMode;
  isStarting: boolean;
  onPrimaryPress: () => void;
  onSelectAudioMode: () => void;
  onSelectTextMode: () => void;
};

export default function ModePickerPanel({
  colors,
  composeMode,
  isStarting,
  onPrimaryPress,
  onSelectAudioMode,
  onSelectTextMode,
}: Props) {
  return (
    <View className="items-center pt-[18px] pb-5">
      <View className="w-full items-center justify-center py-[26px]">
        <Text className="mb-5" style={{ color: colors.textSecondary, fontSize: 16 }}>
          {composeMode === 'audio' ? 'Bấm để ghi âm' : 'Bấm để nhập bằng giọng nói'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPrimaryPress}
          className="h-[86px] w-[86px] items-center justify-center rounded-full"
          style={{ backgroundColor: colors.tint }}
        >
          {isStarting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            composeMode === 'audio' ? (
              <MaterialIcons name="mic" size={36} color="#fff" />
            ) : (
              <View className="h-11 w-11 items-center justify-center">
                <MaterialIcons name="mic" size={34} color="#fff" />
                <Text
                  className="absolute right-[7px] bottom-1.5"
                  style={{
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: '800',
                    lineHeight: 12,
                  }}
                >
                  A
                </Text>
              </View>
            )
          )}
        </TouchableOpacity>
      </View>

      <View className="w-full px-4">
        <View
          className="mx-auto w-full max-w-[420px] flex-row items-center rounded-full p-[3px]"
          style={{ backgroundColor: colors.surfaceVariant }}
        >
          <TouchableOpacity
            onPress={onSelectAudioMode}
            className="h-[38px] flex-1 items-center justify-center rounded-[20px]"
            style={{ backgroundColor: composeMode === 'audio' ? colors.background : 'transparent' }}
          >
            <Text style={{ color: composeMode === 'audio' ? colors.text : colors.textSecondary, fontSize: 15, fontWeight: '700' }}>Gửi bản ghi âm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSelectTextMode}
            className="h-[38px] flex-1 items-center justify-center rounded-[20px]"
            style={{ backgroundColor: composeMode === 'text' ? colors.background : 'transparent' }}
          >
            <Text style={{ color: composeMode === 'text' ? colors.text : colors.textSecondary, fontSize: 15, fontWeight: '700' }}>
              Gửi dạng văn bản
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
