import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import AudioWaveform from '../AudioWaveform';

const formatDuration = (seconds?: number) => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '--:--';
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60).toString().padStart(2, '0');
  const remaining = (rounded % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

const hashWaveSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededAmplitudes = (seedValue: string, count = 72) => {
  const seed = hashWaveSeed(seedValue);

  const barNoise = (index: number) => {
    const n = hashWaveSeed(`${seed}-${index * 7919}`);
    return n / 0xffffffff;
  };

  const profileA = 1.8 + (seed % 11) * 0.17;
  const profileB = 3.6 + ((seed >>> 4) % 13) * 0.11;
  const accentStride = 4 + ((seed >>> 9) % 6);

  const raw = Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1);
    const n1 = barNoise(i);
    const n2 = barNoise(i + 97);

    const wave = Math.abs(Math.sin(t * Math.PI * profileA + n1 * 1.2)) * 0.38;
    const harmonic = Math.abs(Math.cos(t * Math.PI * profileB + n2 * 1.8)) * 0.28;
    const randomBody = Math.pow(n1, 1.45) * 0.42;
    const accent = i % accentStride === 0 ? 0.16 + n2 * 0.18 : 0;

    return Math.max(0.05, Math.min(1, 0.1 + wave + harmonic + randomBody + accent));
  });

  return raw.map((_, i) => {
    const prev = raw[Math.max(0, i - 1)];
    const curr = raw[i];
    const next = raw[Math.min(raw.length - 1, i + 1)];
    return Math.max(0.05, Math.min(1, prev * 0.14 + curr * 0.72 + next * 0.14));
  });
};

type AudioMessageBubbleProps = {
  url: string;
  duration?: number;
  seedKey: string;
  amplitudes?: number[];
  textColor: string;
  isSending?: boolean;
};

export default function AudioMessageBubble({
  url,
  duration,
  seedKey,
  amplitudes,
  textColor,
  isSending,
}: AudioMessageBubbleProps) {
  const player = useAudioPlayer(url, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const [waveWidth, setWaveWidth] = useState(0);

  const waveform = useMemo(() => {
    if (Array.isArray(amplitudes) && amplitudes.length > 0) {
      return amplitudes
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.max(0, Math.min(1, value)));
    }

    return createSeededAmplitudes(`${seedKey}|${url}|${Math.round(duration || 0)}`);
  }, [seedKey, url, duration, amplitudes]);

  const totalDuration = duration || status.duration || 0;
  const progress = totalDuration > 0 ? Math.min(1, status.currentTime / totalDuration) : 0;
  const shouldShowCurrentTime = status.playing || (status.currentTime > 0 && !status.didJustFinish);
  const displayTime = shouldShowCurrentTime ? status.currentTime : totalDuration;
  const displayProgress = shouldShowCurrentTime ? progress : 0;

  const handleTogglePlayback = async () => {
    if (isSending) return;

    if (status.playing) {
      player.pause();
      return;
    }

    const atEnd = totalDuration > 0 && status.currentTime >= totalDuration - 0.15;
    if (status.didJustFinish || atEnd) {
      await player.seekTo(0);
    }

    player.play();
  };

  return (
    <TouchableOpacity onPress={() => {
        void handleTogglePlayback();
      }}
      activeOpacity={0.8}
    >
      <View style={{ minWidth: 170, maxWidth: 230, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isSending ? 'rgba(10,73,161,0.45)' : '#0756C2', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={status.playing ? 'pause' : 'play-arrow'} size={23} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View
            onLayout={(event) => {
              const next = Math.floor(event.nativeEvent.layout.width);
              if (next > 0 && Math.abs(next - waveWidth) > 1) {
                setWaveWidth(next);
              }
            }}
            style={{ overflow: 'hidden' }}
          >
            <AudioWaveform
              width={waveWidth || 118}
              height={18}
              amplitudes={waveform}
              progress={displayProgress}
              activeColor="#0756C2"
              inactiveColor="rgba(7,86,194,0.5)"
              barWidth={3}
              barGap={2.5}
            />
          </View>
          <Text style={{ color: '#3B6FAF', fontSize: 12, marginTop: 4, opacity: 0.95, fontWeight: '700' }}>
            {formatDuration(displayTime)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
