const WAVE_HISTORY_SIZE = 72;
const MAX_VOICE_DURATION_SECONDS = 5 * 60;

const buildSilentWave = () => Array.from({ length: WAVE_HISTORY_SIZE }, () => 0.08);

function normalizeMeteringToAmplitude(metering: number) {
  // expo-audio metering can be either dBFS (negative values) or normalized 0..1 depending on platform/device.
  if (metering >= 0 && metering <= 1) {
    return Math.max(0.03, Math.pow(metering, 0.75));
  }

  const db = Math.max(-120, Math.min(-8, metering));
  const normalized = (db + 120) / 112;
  return Math.max(0.03, Math.pow(normalized, 0.62));
}

const formatSeconds = (seconds?: number) => {
  const value = typeof seconds === 'number' ? Math.max(0, Math.round(seconds)) : 0;
  const mm = Math.floor(value / 60).toString().padStart(2, '0');
  const ss = (value % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

export {
  WAVE_HISTORY_SIZE,
  MAX_VOICE_DURATION_SECONDS,
  buildSilentWave,
  normalizeMeteringToAmplitude,
  formatSeconds,
};
