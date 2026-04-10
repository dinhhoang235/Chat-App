import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import type { ComposeMode } from './types';

type Params = {
  visible: boolean;
  composeMode: ComposeMode;
  isTextSessionActive: boolean;
  isRecording: boolean;
  stopRecording: () => Promise<void>;
  onTranscriptChange?: (text: string) => void;
  onSubmitTranscript?: (text: string) => void | Promise<void>;
  onRequestEditTranscript?: () => void;
  onAction?: (key: 'send_audio' | 'send_text') => void;
  setComposeMode: (mode: ComposeMode) => void;
  setIsTextSessionActive: (value: boolean) => void;
  setIsReviewMode: (value: boolean) => void;
  clearRecordedAudio: () => void;
};

export default function useDictationController({
  visible,
  composeMode,
  isTextSessionActive,
  isRecording,
  stopRecording,
  onTranscriptChange,
  onSubmitTranscript,
  onRequestEditTranscript,
  onAction,
  setComposeMode,
  setIsTextSessionActive,
  setIsReviewMode,
  clearRecordedAudio,
}: Params) {
  const [isDictating, setIsDictating] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [dictationError, setDictationError] = useState<string | null>(null);

  const shouldAutoRestartDictationRef = useRef(false);
  const restartDictationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizedTranscriptRef = useRef('');
  const visibleRef = useRef(visible);
  const composeModeRef = useRef(composeMode);
  const isTextSessionActiveRef = useRef(isTextSessionActive);

  const canKeepDictating = useCallback(() => (
    visibleRef.current
    && composeModeRef.current === 'text'
    && isTextSessionActiveRef.current
  ), []);

  const clearRestartDictationTimeout = useCallback(() => {
    if (!restartDictationTimeoutRef.current) return;
    clearTimeout(restartDictationTimeoutRef.current);
    restartDictationTimeoutRef.current = null;
  }, []);

  const startSpeechRecognizer = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: 'vi-VN',
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      addsPunctuation: true,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 6500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 6500,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 12000,
      },
    });
  }, []);

  const updateDictationText = useCallback((text: string) => {
    setDictationText(text);
    onTranscriptChange?.(text);
  }, [onTranscriptChange]);

  const scheduleDictationRestart = useCallback(() => {
    if (!shouldAutoRestartDictationRef.current || !canKeepDictating()) return;
    clearRestartDictationTimeout();
    restartDictationTimeoutRef.current = setTimeout(() => {
      if (!shouldAutoRestartDictationRef.current || !canKeepDictating()) return;

      try {
        startSpeechRecognizer();
      } catch (error) {
        console.warn('Dictation auto-restart failed:', error);
      }
    }, 180);
  }, [canKeepDictating, clearRestartDictationTimeout, startSpeechRecognizer]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    composeModeRef.current = composeMode;
  }, [composeMode]);

  useEffect(() => {
    isTextSessionActiveRef.current = isTextSessionActive;
  }, [isTextSessionActive]);

  useSpeechRecognitionEvent('start', () => {
    if (!canKeepDictating()) return;
    clearRestartDictationTimeout();
    setIsDictating(true);
    setDictationError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    if (!canKeepDictating()) return;
    setIsDictating(false);

    if (shouldAutoRestartDictationRef.current) {
      scheduleDictationRestart();
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!canKeepDictating()) return;
    const transcript = event.results?.[0]?.transcript?.trim() ?? '';
    if (!transcript) return;

    const combined = [finalizedTranscriptRef.current, transcript].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (event.isFinal) {
      finalizedTranscriptRef.current = combined;
    }
    updateDictationText(combined);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!canKeepDictating()) return;
    setIsDictating(false);

    const code = event.error;
    if (code === 'no-speech' || code === 'aborted') {
      if (shouldAutoRestartDictationRef.current) {
        scheduleDictationRestart();
      }
      return;
    }

    setDictationError(event.message || 'Không thể nhận diện giọng nói.');
  });

  const stopDictation = useCallback(() => {
    shouldAutoRestartDictationRef.current = false;
    clearRestartDictationTimeout();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore stop errors when recognizer is already idle
    }
    setIsDictating(false);
  }, [clearRestartDictationTimeout]);

  const startDictation = useCallback(async (resetText = false) => {
    try {
      if (isRecording) {
        await stopRecording();
      }

      setComposeMode('text');
      setIsTextSessionActive(true);
      setIsReviewMode(false);
      clearRecordedAudio();
      shouldAutoRestartDictationRef.current = true;
      clearRestartDictationTimeout();

      if (resetText) {
        finalizedTranscriptRef.current = '';
        updateDictationText('');
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setDictationError('Bạn chưa cấp quyền nhận diện giọng nói.');
        setIsTextSessionActive(false);
        shouldAutoRestartDictationRef.current = false;
        return;
      }

      setDictationError(null);
      startSpeechRecognizer();
      onAction?.('send_text');
    } catch (error) {
      console.error('Start dictation failed:', error);
      setDictationError('Không thể bắt đầu nhận diện giọng nói.');
      setIsTextSessionActive(false);
      shouldAutoRestartDictationRef.current = false;
    }
  }, [
    isRecording,
    stopRecording,
    setComposeMode,
    setIsTextSessionActive,
    setIsReviewMode,
    clearRecordedAudio,
    clearRestartDictationTimeout,
    updateDictationText,
    startSpeechRecognizer,
    onAction,
  ]);

  const clearDictation = useCallback(() => {
    stopDictation();
    setIsTextSessionActive(false);
    finalizedTranscriptRef.current = '';
    updateDictationText('');
    setDictationError(null);
    setComposeMode('text');
  }, [stopDictation, setIsTextSessionActive, updateDictationText, setComposeMode]);

  const submitDictation = useCallback(async () => {
    const text = dictationText.trim();
    if (!text) return;
    stopDictation();
    await onSubmitTranscript?.(text);
  }, [dictationText, stopDictation, onSubmitTranscript]);

  const editDictation = useCallback(() => {
    stopDictation();
    onRequestEditTranscript?.();
  }, [stopDictation, onRequestEditTranscript]);

  useEffect(() => () => {
    clearRestartDictationTimeout();
  }, [clearRestartDictationTimeout]);

  return {
    isDictating,
    dictationText,
    dictationError,
    setDictationError,
    stopDictation,
    startDictation,
    clearDictation,
    submitDictation,
    editDictation,
  };
}
