import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import AudioWaveform from '@/components/chat/AudioWaveform';
import type { ComposerMicColors } from './types';
import { formatSeconds } from './utils';

type Props = {
  colors: ComposerMicColors;
  isReviewMode: boolean;
  canShowReview: boolean;
  isSending: boolean;
  elapsedSeconds: number;
  reviewSeconds: number;
  reviewProgress: number;
  waveAmplitudes: number[];
  isPlaying: boolean;
  onClearRecording: () => void;
  onSendRecordedAudio: () => void;
  onEnterReviewMode: () => void;
  onTogglePlayback: () => void;
};

export default function VoiceComposePanel({
  colors,
  isReviewMode,
  canShowReview,
  isSending,
  elapsedSeconds,
  reviewSeconds,
  reviewProgress,
  waveAmplitudes,
  isPlaying,
  onClearRecording,
  onSendRecordedAudio,
  onEnterReviewMode,
  onTogglePlayback,
}: Props) {
  const [reviewWaveWidth, setReviewWaveWidth] = useState(0);
  const [recordWaveWidth, setRecordWaveWidth] = useState(0);

  const updateWidth = (setter: React.Dispatch<React.SetStateAction<number>>) => (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(1, Math.floor(event.nativeEvent.layout.width));
    setter((prev) => (Math.abs(prev - nextWidth) > 1 ? nextWidth : prev));
  };

  return (
    <View className="px-4 pt-[36px] pb-[22px]" style={{ backgroundColor: colors.surface }}>
      {isReviewMode ? (
        <View
          className="h-[52px] flex-row items-center rounded-full border px-[10px]"
          style={{ borderColor: '#D7E7FF', backgroundColor: '#F7FAFF' }}
        >
          <TouchableOpacity
            onPress={onTogglePlayback}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: '#D9E9FF' }}
          >
            <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={21} color="#2F4F7A" />
          </TouchableOpacity>
          <View className="mx-[10px] flex-1" onLayout={updateWidth(setReviewWaveWidth)}>
            <AudioWaveform
              width={reviewWaveWidth || 180}
              height={18}
              amplitudes={waveAmplitudes}
              progress={reviewProgress}
              activeColor="#2F4F7A"
              inactiveColor="#AFC4DF"
              barWidth={3}
              barGap={2}
            />
          </View>
          <Text style={{ color: '#3F608C', fontSize: 16, fontWeight: '800' }}>{formatSeconds(reviewSeconds)}</Text>
        </View>
      ) : (
        <View
          className="h-[50px] flex-row items-center justify-between rounded-full border px-3"
          style={{ backgroundColor: '#1F76EE', borderColor: '#4A96FF' }}
        >
          <View className="mr-3 flex-1" onLayout={updateWidth(setRecordWaveWidth)}>
            <AudioWaveform
              width={recordWaveWidth || 190}
              height={18}
              amplitudes={waveAmplitudes}
              progress={1}
              activeColor="#F5FAFF"
              inactiveColor="rgba(245,250,255,0.42)"
              barWidth={3}
              barGap={2}
            />
          </View>
          <View className="h-7 items-center justify-center rounded-full px-2" style={{ backgroundColor: 'rgba(12,57,126,0.22)' }}>
            <Text style={{ color: '#F6FBFF', fontSize: 16, fontWeight: '800' }}>{formatSeconds(elapsedSeconds)}</Text>
          </View>
        </View>
      )}

      <View className="mt-[52px] flex-row items-end justify-around">
        <TouchableOpacity onPress={onClearRecording} disabled={isSending} className="w-[72px] items-center">
          <MaterialIcons name="delete" size={28} color={colors.textSecondary} />
          <Text className="mt-2" style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Xóa</Text>
        </TouchableOpacity>

        <View className="w-[88px] items-center">
          <TouchableOpacity
            onPress={onSendRecordedAudio}
            disabled={isSending}
            className="h-[78px] w-[78px] items-center justify-center rounded-full"
            style={{ backgroundColor: isSending ? '#6B9FE2' : '#0756C2' }}
          >
            <AntDesign name="send" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="mt-2" style={{ color: colors.text, fontSize: 17 }}>Gửi</Text>
        </View>

        {!isReviewMode && canShowReview ? (
          <TouchableOpacity
            onPress={onEnterReviewMode}
            className="w-[72px] items-center"
          >
            <MaterialIcons name="graphic-eq" size={28} color={colors.textSecondary} />
            <Text className="mt-2" style={{ color: colors.text, fontSize: 17, fontWeight: '500' }}>Nghe lại</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-[72px]" />
        )}
      </View>
    </View>
  );
}
