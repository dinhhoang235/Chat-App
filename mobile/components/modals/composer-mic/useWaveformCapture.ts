import { useEffect, useRef, useState } from 'react';
import type { AudioRecorder, RecorderState } from 'expo-audio';
import {
  WAVE_HISTORY_SIZE,
  MAX_VOICE_DURATION_SECONDS,
  buildSilentWave,
  normalizeMeteringToAmplitude,
} from './utils';

type Params = {
  recorder: AudioRecorder;
  recorderState: RecorderState;
  onDurationLimitReached: () => void;
};

export default function useWaveformCapture({
  recorder,
  recorderState,
  onDurationLimitReached,
}: Params) {
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(buildSilentWave);
  const waveAmplitudesRef = useRef<number[]>(buildSilentWave());
  const lastMeteringUpdateAtRef = useRef<number>(0);
  const hasReachedDurationLimitRef = useRef(false);

  const resetWave = () => {
    setWaveAmplitudes(buildSilentWave());
    waveAmplitudesRef.current = buildSilentWave();
    lastMeteringUpdateAtRef.current = 0;
    hasReachedDurationLimitRef.current = false;
  };

  useEffect(() => {
    if (!recorderState.isRecording) {
      hasReachedDurationLimitRef.current = false;
    }
  }, [recorderState.isRecording]);

  useEffect(() => {
    if (!recorderState.isRecording) {
      return;
    }

    const metering = recorderState.metering;
    if (typeof metering !== 'number' || !Number.isFinite(metering)) {
      return;
    }

    const shaped = normalizeMeteringToAmplitude(metering);
    lastMeteringUpdateAtRef.current = Date.now();

    setWaveAmplitudes((prev) => {
      const next = prev.length >= WAVE_HISTORY_SIZE ? prev.slice(0, WAVE_HISTORY_SIZE - 1) : prev;
      const merged = [shaped, ...next];
      waveAmplitudesRef.current = merged;
      return merged;
    });
  }, [recorderState.isRecording, recorderState.metering]);

  useEffect(() => {
    if (!recorderState.isRecording) {
      return;
    }

    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastMeteringUpdateAtRef.current < 300) {
        return;
      }

      const status = recorder.getStatus();
      const metering = status.metering;
      if (typeof metering !== 'number' || !Number.isFinite(metering)) {
        return;
      }

      const shaped = normalizeMeteringToAmplitude(metering);
      lastMeteringUpdateAtRef.current = now;

      setWaveAmplitudes((prev) => {
        const next = prev.length >= WAVE_HISTORY_SIZE ? prev.slice(0, WAVE_HISTORY_SIZE - 1) : prev;
        const merged = [shaped, ...next];
        waveAmplitudesRef.current = merged;
        return merged;
      });
    }, 120);

    return () => clearInterval(id);
  }, [recorderState.isRecording, recorder]);

  useEffect(() => {
    if (!recorderState.isRecording) {
      return;
    }

    if (
      !hasReachedDurationLimitRef.current
      && recorderState.durationMillis >= MAX_VOICE_DURATION_SECONDS * 1000
    ) {
      hasReachedDurationLimitRef.current = true;
      onDurationLimitReached();
    }
  }, [recorderState.isRecording, recorderState.durationMillis, onDurationLimitReached]);

  return {
    waveAmplitudes,
    waveAmplitudesRef,
    resetWave,
  };
}
