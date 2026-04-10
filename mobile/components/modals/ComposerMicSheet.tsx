import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/context/themeContext';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import TextComposePanel from './composer-mic/TextComposePanel';
import VoiceComposePanel from './composer-mic/VoiceComposePanel';
import ModePickerPanel from './composer-mic/ModePickerPanel';
import type { ComposeMode, VoiceAttachment } from './composer-mic/types';
import useDictationController from './composer-mic/useDictationController';
import useWaveformCapture from './composer-mic/useWaveformCapture';

const VOICE_RECORDING_PRESET = RecordingPresets.HIGH_QUALITY;

export default function ComposerMicSheet({
  visible,
  onClose,
  onLockOutsideCloseChange,
  onVoiceFlowChange,
  onAction,
  onSendAudio,
  onTranscriptChange,
  onSubmitTranscript,
  onRequestEditTranscript,
  textMode,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  onLockOutsideCloseChange?: (locked: boolean) => void;
  onVoiceFlowChange?: (active: boolean) => void;
  onAction?: (key: 'send_audio' | 'send_text') => void;
  onSendAudio?: (file: VoiceAttachment) => void | Promise<void>;
  onTranscriptChange?: (text: string) => void;
  onSubmitTranscript?: (text: string) => void | Promise<void>;
  onRequestEditTranscript?: () => void;
  textMode?: boolean;
  height?: number;
}) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const recorderConfig = useMemo(
    () => ({
      ...VOICE_RECORDING_PRESET,
      isMeteringEnabled: true,
    }),
    []
  );
  const recorder = useAudioRecorder(recorderConfig);
  const recorderState = useAudioRecorderState(recorder, 80);
  const [recordedAudio, setRecordedAudio] = useState<VoiceAttachment | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>(textMode ? 'text' : 'audio');
  const [isTextSessionActive, setIsTextSessionActive] = useState(false);
  const player = useAudioPlayer(recordedAudio?.uri ?? null, { downloadFirst: true });
  const playerStatus = useAudioPlayerStatus(player);
  const stopActiveRecording = useCallback(async () => {
    if (!recorderState.isRecording) return;
    await recorder.stop();
  }, [recorder, recorderState.isRecording]);

  const {
    isDictating,
    dictationText,
    dictationError,
    setDictationError,
    stopDictation,
    startDictation,
    clearDictation,
    submitDictation,
    editDictation,
  } = useDictationController({
    visible,
    composeMode,
    isTextSessionActive,
    isRecording: recorderState.isRecording,
    stopRecording: stopActiveRecording,
    onTranscriptChange,
    onSubmitTranscript,
    onRequestEditTranscript,
    onAction,
    setComposeMode,
    setIsTextSessionActive,
    setIsReviewMode,
    clearRecordedAudio: () => setRecordedAudio(null),
  });

  const { waveAmplitudes, waveAmplitudesRef, resetWave } = useWaveformCapture({
    recorder,
    recorderState,
    onDurationLimitReached: () => {
      void stopRecording().then(() => setIsReviewMode(true));
    },
  });

  const snapPoints = useMemo(() => {
    const h = height ?? Math.round(Dimensions.get('window').height * 0.35);
    return [h];
  }, [height]);

  const deleteLocalAudioFile = useCallback(async (uri?: string | null) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete local audio file:', error);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setComposeMode(textMode ? 'text' : 'audio');
  }, [visible, textMode]);

  const startRecording = async () => {
    try {
      setIsStarting(true);
      setComposeMode('audio');
      stopDictation();

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      player.pause();
      setRecordedAudio(null);
      setIsReviewMode(false);
      resetWave();
      await recorder.prepareToRecordAsync();
      await recorder.record();
    } catch (error) {
      console.error('Start recording failed:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const stopRecording = useCallback(async () => {
    try {
      if (!recorderState.isRecording) return recordedAudio;

      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return null;

      const duration = Math.max(1, Math.round(recorderState.durationMillis / 1000));
      const file: VoiceAttachment = {
        uri,
        name: `voice-${Date.now()}.m4a`,
        type: 'audio/m4a',
        duration,
        waveform: [...waveAmplitudesRef.current],
      };
      setRecordedAudio(file);
      return file;
    } catch (error) {
      console.error('Stop recording failed:', error);
      return null;
    }
  }, [recorder, recorderState.durationMillis, recorderState.isRecording, recordedAudio, waveAmplitudesRef]);

  const toggleRecording = async () => {
    if (recorderState.isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  };

  const clearRecording = async () => {
    const previousAudioUri = recordedAudio?.uri;
    if (recorderState.isRecording) {
      await recorder.stop();
    }
    player.pause();
    setIsReviewMode(false);
    setRecordedAudio(null);
    resetWave();
    await deleteLocalAudioFile(previousAudioUri);
  };

  const togglePlayback = async () => {
    if (!recordedAudio) return;
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    await player.seekTo(0);
    player.play();
  };

  const enterReviewMode = async () => {
    setIsReviewMode(true);

    let file = recordedAudio;
    if (recorderState.isRecording) {
      file = await stopRecording();
    }

    if (!file) {
      setIsReviewMode(false);
      return;
    }
  };

  useEffect(() => {
    if (!isReviewMode || !recordedAudio) return;

    const playFromStart = async () => {
      try {
        await player.seekTo(0);
        player.play();
      } catch (error) {
        console.warn('Failed to start review playback:', error);
      }
    };

    void playFromStart();
  }, [isReviewMode, recordedAudio, player]);

  const sendRecordedAudio = async () => {
    if (isSending) return;
    setIsSending(true);
    const file = recorderState.isRecording ? await stopRecording() : recordedAudio;
    if (!file) {
      setIsSending(false);
      return;
    }

    try {
      await onSendAudio?.(file);
      setIsReviewMode(false);
      setRecordedAudio(null);
      await deleteLocalAudioFile(file.uri);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      let cancelled = false;

      const cleanupOnHide = async () => {
        stopDictation();

        if (recorderState.isRecording) {
          try {
            await recorder.stop();
          } catch (error) {
            console.warn('Failed to stop recorder during sheet close:', error);
          }
        }

        const previousAudioUri = recordedAudio?.uri;
        player.pause();

        if (cancelled) return;

        setIsReviewMode(false);
        setComposeMode(textMode ? 'text' : 'audio');
        setIsTextSessionActive(false);
        setRecordedAudio(null);
        resetWave();
        await deleteLocalAudioFile(previousAudioUri);
        sheetRef.current?.close();
      };

      void cleanupOnHide();

      return () => {
        cancelled = true;
      };
    }
  }, [visible, recorderState.isRecording, recorder, player, textMode, stopDictation, resetWave, recordedAudio?.uri, deleteLocalAudioFile]);

  const isTextPanel = composeMode === 'text' && isTextSessionActive;
  const isVoicePanel = composeMode === 'audio' && (recorderState.isRecording || !!recordedAudio);
  const elapsedSeconds = recorderState.isRecording
    ? Math.max(1, Math.round(recorderState.durationMillis / 1000))
    : (recordedAudio?.duration || 0);

  const reviewSeconds = playerStatus.currentTime > 0 ? playerStatus.currentTime : elapsedSeconds;
  const reviewProgress = elapsedSeconds > 0 ? Math.min(1, reviewSeconds / elapsedSeconds) : 0;
  const canShowReview = !!recordedAudio || (recorderState.isRecording && recorderState.durationMillis >= 1000);
  const isVoiceFlowActive = visible && composeMode === 'audio' && (recorderState.isRecording || !!recordedAudio);
  const shouldLockOutsideClose = visible && (
    (composeMode === 'audio' && (recorderState.isRecording || !!recordedAudio))
    || (composeMode === 'text' && isTextSessionActive)
  );

  useEffect(() => {
    onLockOutsideCloseChange?.(shouldLockOutsideClose);
  }, [onLockOutsideCloseChange, shouldLockOutsideClose]);

  useEffect(() => {
    onVoiceFlowChange?.(isVoiceFlowActive);
  }, [onVoiceFlowChange, isVoiceFlowActive]);

  useEffect(() => {
    return () => {
      onLockOutsideCloseChange?.(false);
      onVoiceFlowChange?.(false);
    };
  }, [onLockOutsideCloseChange, onVoiceFlowChange]);

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
      <BottomSheetView>
        {isTextPanel ? (
          <TextComposePanel
            colors={colors}
            isDictating={isDictating}
            dictationText={dictationText}
            dictationError={dictationError}
            onClear={clearDictation}
            onSubmit={() => {
              void submitDictation();
            }}
            onEdit={editDictation}
          />
        ) : isVoicePanel ? (
          <VoiceComposePanel
            colors={colors}
            isReviewMode={isReviewMode}
            canShowReview={canShowReview}
            isSending={isSending}
            elapsedSeconds={elapsedSeconds}
            reviewSeconds={reviewSeconds}
            reviewProgress={reviewProgress}
            waveAmplitudes={waveAmplitudes}
            isPlaying={playerStatus.playing}
            onClearRecording={() => {
              void clearRecording();
            }}
            onSendRecordedAudio={() => {
              void sendRecordedAudio();
            }}
            onEnterReviewMode={() => {
              void enterReviewMode();
            }}
            onTogglePlayback={() => {
              void togglePlayback();
            }}
          />
        ) : (
          <ModePickerPanel
            colors={colors}
            composeMode={composeMode}
            isStarting={isStarting}
            onPrimaryPress={() => {
              if (composeMode === 'audio') {
                void toggleRecording();
                return;
              }
              void startDictation(true);
            }}
            onSelectAudioMode={() => {
              setComposeMode('audio');
              setIsTextSessionActive(false);
              stopDictation();
              onAction?.('send_audio');
            }}
            onSelectTextMode={() => {
              setComposeMode('text');
              setIsTextSessionActive(false);
              setDictationError(null);
              onAction?.('send_text');
            }}
          />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
