/**
 * Modern mobile color system
 * Optimized for React Native + chat app
 * Based on Material Design dark mode (no pure black)
 */

import { Platform } from 'react-native';

/* ===============================
   Brand color
================================ */
const tintColorLight = '#3B82F6'; // blue-500
const tintColorDark = '#60A5FA';

/* ===============================
   Colors
================================ */
export const Colors = {
  light: {
    /* text */
    text: '#11181C',
    textSecondary: '#6B7280',

    /* backgrounds */
    background: '#FFFFFF',
    surface: '#F9FAFB',
    card: '#FFFFFF',

    /* ui */
    border: '#E5E7EB',
    surfaceVariant: '#E5E7EB',

    /* brand */
    tint: tintColorLight,

    /* icons / tabs */
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,

    /* states */
    danger: '#EF4444',
    success: '#22C55E',
  },

  dark: {
    /* text */
    text: 'rgba(255,255,255,0.87)',
    textSecondary: 'rgba(255,255,255,0.6)',

    /* backgrounds (layered for depth) */
    background: '#121212', // main bg
    surface: '#1E1E1E',    // input / header
    card: '#2A2A2A',       // card / message bubble

    /* ui */
    border: 'rgba(255,255,255,0.12)',
    surfaceVariant: '#2F2F2F',

    /* brand */
    tint: tintColorDark,

    /* icons / tabs */
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,

    /* states */
    danger: '#F87171',
    success: '#4ADE80',
  },
};

/* ===============================
   Fonts (giữ nguyên)
================================ */
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:
      "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
