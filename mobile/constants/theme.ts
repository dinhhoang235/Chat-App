/**
 * Modern mobile color system
 * Tuned specifically for Chat App (Discord / Telegram style)
 * Dark mode uses layered greys (NOT pure black)
 */

import { Platform } from 'react-native';

/* ===============================
   Brand
================================ */
const tintColorLight = '#3B82F6';
const tintColorDark = '#3B82F6';

/* ===============================
   Colors
================================ */
export const Colors = {
  light: {
    /* text */
    text: '#0F172A',
    textSecondary: '#64748B',

    /* backgrounds */
    background: '#FFFFFF',
    header: '#FFFFFF',
    surface: '#F8FAFC',
    card: '#FFFFFF',

    /* chat */
    input: '#F1F5F9',
    bubbleMe: tintColorLight,
    bubbleOther: '#F1F5F9',
    bubbleMeText: '#FFFFFF',
    bubbleOtherText: '#0F172A',

    /* ui */
    border: '#E2E8F0',
    surfaceVariant: '#E2E8F0',

    /* brand */
    tint: tintColorLight,

    /* icons / tabs */
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorLight,

    /* states */
    danger: '#EF4444',
    success: '#22C55E',
  },

  dark: {
    /* text */
    text: 'rgba(255,255,255,0.88)',
    textSecondary: 'rgba(255,255,255,0.55)',

    /* layered backgrounds (depth) */
    background: '#121212', // page
    header: '#1B1B1B',     // header bar
    surface: '#1E1E1E',    // input / toolbar
    card: '#262626',       // bubble other / cards

    /* chat */
    input: '#202020',
    bubbleMe: tintColorDark,     // brand blue
    bubbleOther: '#262626',
    bubbleMeText: '#FFFFFF',
    bubbleOtherText: 'rgba(255,255,255,0.88)',

    /* ui */
    border: 'rgba(255,255,255,0.10)',
    surfaceVariant: '#2F2F2F',

    /* brand */
    tint: tintColorDark,

    /* icons / tabs */
    icon: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
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
