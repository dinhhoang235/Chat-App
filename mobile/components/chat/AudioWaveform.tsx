import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

type AudioWaveformProps = {
  width: number;
  height?: number;
  bars?: number;
  amplitudes?: number[];
  progress?: number;
  activeColor?: string;
  inactiveColor?: string;
  barWidth?: number;
  barGap?: number;
  style?: ViewStyle;
};

export default function AudioWaveform({
  width,
  height = 16,
  bars,
  amplitudes,
  progress = 0,
  activeColor = '#0A68E8',
  inactiveColor = 'rgba(10,104,232,0.35)',
  barWidth = 2,
  barGap = 2,
  style,
}: AudioWaveformProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));

  const { heights, step, xOffset, barsToRender } = useMemo(() => {
    const minH = Math.max(3, Math.round(height * 0.28));
    const maxH = Math.max(minH + 1, Math.round(height * 0.95));
    const barsFromWidth = Math.max(8, Math.floor((width + barGap) / (barWidth + barGap)));
    const barsToUse = Math.max(1, bars ?? barsFromWidth);

    const hasAmplitudes = Array.isArray(amplitudes) && amplitudes.length > 0;

    const getAmplitudeAt = (index: number) => {
      if (!hasAmplitudes) return 0;
      if (amplitudes.length === 1) return Math.max(0, Math.min(1, amplitudes[0] ?? 0));

      const t = (index / Math.max(1, barsToUse - 1)) * (amplitudes.length - 1);
      const left = Math.floor(t);
      const right = Math.min(amplitudes.length - 1, left + 1);
      const ratio = t - left;
      const a = amplitudes[left] ?? 0;
      const b = amplitudes[right] ?? a;
      const value = a + (b - a) * ratio;
      return Math.max(0, Math.min(1, value));
    };

    const arr = Array.from({ length: barsToUse }, (_, i) => {
      if (hasAmplitudes) {
        const prev = getAmplitudeAt(Math.max(0, i - 1));
        const curr = getAmplitudeAt(i);
        const next = getAmplitudeAt(Math.min(barsToUse - 1, i + 1));
        const amp = prev * 0.22 + curr * 0.56 + next * 0.22;
        const shaped = Math.pow(amp, 0.72);
        return Math.round(minH + (maxH - minH) * shaped);
      }

      // Fallback pseudo-wave profile when no amplitude data is provided.
      const t = i / Math.max(1, barsToUse - 1);
      const v = Math.abs(Math.sin(t * Math.PI * 2.6)) * 0.65 + Math.abs(Math.cos(t * Math.PI * 5.2)) * 0.35;
      return Math.round(minH + (maxH - minH) * v);
    });

    const s = barWidth + barGap;
    const contentWidth = arr.length > 0 ? (arr.length - 1) * s + barWidth : 0;
    const offset = Math.max(0, (width - contentWidth) / 2);

    return { heights: arr, step: s, xOffset: offset, barsToRender: barsToUse };
  }, [width, height, bars, barWidth, barGap, amplitudes]);

  return (
    <View style={style}>
      <Svg width={width} height={height}>
        {heights.map((h, i) => {
          const x = xOffset + i * step;
          const y = (height - h) / 2;
          const active = i <= Math.round(safeProgress * (barsToRender - 1));

          return (
            <Rect
              key={`wave-${i}`}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={barWidth / 2}
              fill={active ? activeColor : inactiveColor}
            />
          );
        })}
      </Svg>
    </View>
  );
}
