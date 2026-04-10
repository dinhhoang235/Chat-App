import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useTheme } from '@/context/themeContext';
import AudioWaveform from '@/components/chat/AudioWaveform';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

type VoiceAttachment = {
  uri: string;
  name: string;
  type: string;
  duration?: number;
};

const WAVE_HISTORY_SIZE = 72;
const buildSilentWave = () => Array.from({ length: WAVE_HISTORY_SIZE }, () => 0.08);

export default function ComposerMicSheet({
  visible,
  onClose,
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
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 80);
  const [recordedAudio, setRecordedAudio] = useState<VoiceAttachment | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [composeMode, setComposeMode] = useState<'audio' | 'text'>(textMode ? 'text' : 'audio');
  const [isTextSessionActive, setIsTextSessionActive] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(buildSilentWave);
  const [reviewWaveWidth, setReviewWaveWidth] = useState(0);
  const [recordWaveWidth, setRecordWaveWidth] = useState(0);
  const player = useAudioPlayer(recordedAudio?.uri ?? null, { downloadFirst: true });
  const playerStatus = useAudioPlayerStatus(player);

  const updateWidth = (setter: React.Dispatch<React.SetStateAction<number>>) => (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(1, Math.floor(event.nativeEvent.layout.width));
    setter((prev) => (Math.abs(prev - nextWidth) > 1 ? nextWidth : prev));
  };

  useSpeechRecognitionEvent('start', () => {
    if (!visible || composeMode !== 'text' || !isTextSessionActive) return;
    setIsDictating(true);
    setDictationError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    if (!visible || composeMode !== 'text' || !isTextSessionActive) return;
    setIsDictating(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!visible || composeMode !== 'text' || !isTextSessionActive) return;
    const transcript = event.results?.[0]?.transcript?.trim() ?? '';
    setDictationText(transcript);
    onTranscriptChange?.(transcript);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!visible || composeMode !== 'text' || !isTextSessionActive) return;
    setIsDictating(false);
    setDictationError(event.message || 'Không thể nhận diện giọng nói.');
  });

  const stopDictation = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore stop errors when recognizer is already idle
    }
    setIsDictating(false);
  };

  const startDictation = async (resetText = false) => {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }

      setComposeMode('text');
      setIsTextSessionActive(true);
      setIsReviewMode(false);
      setRecordedAudio(null);

      if (resetText) {
        setDictationText('');
        onTranscriptChange?.('');
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setDictationError('Bạn chưa cấp quyền nhận diện giọng nói.');
        setIsTextSessionActive(false);
        return;
      }

      setDictationError(null);
      ExpoSpeechRecognitionModule.start({
        lang: 'vi-VN',
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        addsPunctuation: true,
      });
      onAction?.('send_text');
    } catch (error) {
      console.error('Start dictation failed:', error);
      setDictationError('Không thể bắt đầu nhận diện giọng nói.');
      setIsTextSessionActive(false);
    }
  };

  const clearDictation = () => {
    stopDictation();
    setIsTextSessionActive(false);
    setDictationText('');
    setDictationError(null);
    setComposeMode('text');
    onTranscriptChange?.('');
  };

  const submitDictation = async () => {
    const text = dictationText.trim();
    if (!text) return;
    stopDictation();
    await onSubmitTranscript?.(text);
  };

  const editDictation = () => {
    stopDictation();
    onRequestEditTranscript?.();
  };

  const snapPoints = useMemo(() => {
    const h = height ?? Math.round(Dimensions.get('window').height * 0.35);
    return [h];
  }, [height]);

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
      setWaveAmplitudes(buildSilentWave());
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      console.error('Start recording failed:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const stopRecording = async () => {
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
      };
      setRecordedAudio(file);
      return file;
    } catch (error) {
      console.error('Stop recording failed:', error);
      return null;
    }
  };

  const toggleRecording = async () => {
    if (recorderState.isRecording) {
      await stopRecording();
      return;
    }

    await startRecording();
  };

  const clearRecording = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
    }
    player.pause();
    setIsReviewMode(false);
    setRecordedAudio(null);
    setWaveAmplitudes(buildSilentWave());
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
    const file = recorderState.isRecording ? await stopRecording() : recordedAudio;
    if (!file) return;

    await onSendAudio?.(file);
    setIsReviewMode(false);
    setRecordedAudio(null);
    onClose();
  };

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      stopDictation();
      if (recorderState.isRecording) {
        void recorder.stop();
      }
      player.pause();
      setIsReviewMode(false);
      setComposeMode(textMode ? 'text' : 'audio');
      setIsTextSessionActive(false);
      setRecordedAudio(null);
      setWaveAmplitudes(buildSilentWave());
      sheetRef.current?.close();
    }
  }, [visible, recorderState.isRecording, recorder, player, textMode]);

  useEffect(() => {
    if (!recorderState.isRecording) {
      return;
    }

    const id = setInterval(() => {
      const status = recorder.getStatus();
      const metering = typeof status.metering === 'number' ? status.metering : undefined;

      if (typeof metering !== 'number') {
        return;
      }

      // Metering is dBFS (silence is a large negative value). Expand range so quiet voices still move.
      const db = Math.max(-120, Math.min(-8, metering));
      const normalized = (db + 120) / 112;
      const shaped = Math.max(0.03, Math.pow(normalized, 0.62));

      setWaveAmplitudes((prev) => {
        const next = prev.length >= WAVE_HISTORY_SIZE ? prev.slice(prev.length - (WAVE_HISTORY_SIZE - 1)) : prev;
        return [...next, shaped];
      });
    }, 70);

    return () => clearInterval(id);
  }, [recorderState.isRecording, recorder]);

  const formatSeconds = (seconds?: number) => {
    const value = typeof seconds === 'number' ? Math.max(0, Math.round(seconds)) : 0;
    const mm = Math.floor(value / 60).toString().padStart(2, '0');
    const ss = (value % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const isTextPanel = composeMode === 'text' && isTextSessionActive;
  const isVoicePanel = composeMode === 'audio' && (recorderState.isRecording || !!recordedAudio);
  const elapsedSeconds = recorderState.isRecording
    ? Math.max(1, Math.round(recorderState.durationMillis / 1000))
    : (recordedAudio?.duration || 0);

  const reviewSeconds = playerStatus.currentTime > 0 ? playerStatus.currentTime : elapsedSeconds;
  const reviewProgress = elapsedSeconds > 0 ? Math.min(1, reviewSeconds / elapsedSeconds) : 0;
  const canShowReview = !!recordedAudio || (recorderState.isRecording && recorderState.durationMillis >= 1000);

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
          <View style={{ paddingTop: 18, paddingBottom: 22, paddingHorizontal: 16, backgroundColor: colors.surface }}>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
                {isDictating ? 'Đang lắng nghe...' : 'Đã dừng nghe'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }} numberOfLines={2}>
                {dictationText || 'Nói để nhập văn bản'}
              </Text>
              {dictationError ? (
                <Text style={{ color: '#FF8F8F', fontSize: 13, marginTop: 6 }} numberOfLines={2}>
                  {dictationError}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 26 }}>
              <TouchableOpacity
                onPress={clearDictation}
                style={{ alignItems: 'center', width: 72 }}
              >
                <MaterialIcons name="delete" size={28} color={colors.textSecondary} />
                <Text style={{ color: colors.text, marginTop: 8, fontSize: 17, fontWeight: '500' }}>Xóa</Text>
              </TouchableOpacity>

              <View style={{ alignItems: 'center', width: 88 }}>
                <TouchableOpacity
                  onPress={submitDictation}
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    backgroundColor: '#0A67E8',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign name="send" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={{ color: colors.text, marginTop: 8, fontSize: 17 }}>Gửi</Text>
              </View>

              <TouchableOpacity
                onPress={editDictation}
                style={{ alignItems: 'center', width: 88 }}
              >
                <MaterialIcons name="edit" size={28} color={colors.textSecondary} />
                <Text numberOfLines={1} style={{ color: colors.text, marginTop: 8, fontSize: 17, fontWeight: '500' }}>Chỉnh sửa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isVoicePanel ? (
          <View style={{ paddingTop: 18, paddingBottom: 22, paddingHorizontal: 16, backgroundColor: colors.surface }}>
            {isReviewMode ? (
              <View
                style={{
                  height: 52,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: '#D7E7FF',
                  backgroundColor: '#F7FAFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                }}
              >
                <TouchableOpacity
                  onPress={togglePlayback}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#D9E9FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name={playerStatus.playing ? 'pause' : 'play-arrow'} size={21} color="#2F4F7A" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10, marginRight: 10 }} onLayout={updateWidth(setReviewWaveWidth)}>
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
                style={{
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#1F76EE',
                  borderWidth: 1,
                  borderColor: '#4A96FF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 12,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }} onLayout={updateWidth(setRecordWaveWidth)}>
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
                <View style={{ paddingHorizontal: 8, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,57,126,0.22)' }}>
                  <Text style={{ color: '#F6FBFF', fontSize: 16, fontWeight: '800' }}>{formatSeconds(elapsedSeconds)}</Text>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 26 }}>
              <TouchableOpacity onPress={clearRecording} style={{ alignItems: 'center', width: 72 }}>
                <MaterialIcons name="delete" size={28} color={colors.textSecondary} />
                <Text style={{ color: colors.text, marginTop: 8, fontSize: 17, fontWeight: '500' }}>Xóa</Text>
              </TouchableOpacity>

              <View style={{ alignItems: 'center', width: 88 }}>
                <TouchableOpacity
                  onPress={sendRecordedAudio}
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    backgroundColor: '#0756C2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AntDesign name="send" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={{ color: colors.text, marginTop: 8, fontSize: 17 }}>Gửi</Text>
              </View>

              {!isReviewMode && canShowReview ? (
                <TouchableOpacity
                  onPress={enterReviewMode}
                  style={{ alignItems: 'center', width: 72 }}
                >
                  <MaterialIcons name="graphic-eq" size={28} color={colors.textSecondary} />
                  <Text style={{ color: colors.text, marginTop: 8, fontSize: 17, fontWeight: '500' }}>Nghe lại</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 72 }} />
              )}
            </View>
          </View>
        ) : (
          <View style={{ paddingTop: 18, paddingBottom: 20, alignItems: 'center' }}>
            <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 26 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 20 }}>
                {composeMode === 'audio' ? 'Bấm để ghi âm' : 'Bấm để nhập bằng giọng nói'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (composeMode === 'audio') {
                    void toggleRecording();
                  } else {
                    void startDictation(true);
                  }
                }}
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: 43,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.tint,
                }}
              >
                {isStarting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  composeMode === 'audio' ? (
                    <MaterialIcons name="mic" size={36} color="#fff" />
                  ) : (
                    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="mic" size={34} color="#fff" />
                      <Text
                        style={{
                          position: 'absolute',
                          right: 7,
                          bottom: 6,
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

            <View style={{ width: '100%', paddingHorizontal: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: 24,
                  padding: 3,
                  maxWidth: 420,
                  alignSelf: 'center',
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setComposeMode('audio');
                    setIsTextSessionActive(false);
                    stopDictation();
                    onAction?.('send_audio');
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    backgroundColor: composeMode === 'audio' ? colors.background : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 38,
                  }}
                >
                  <Text style={{ color: composeMode === 'audio' ? colors.text : colors.textSecondary, fontSize: 15, fontWeight: '700' }}>Gửi bản ghi âm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setComposeMode('text');
                    setIsTextSessionActive(false);
                    setDictationError(null);
                    onAction?.('send_text');
                  }}
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    backgroundColor: composeMode === 'text' ? colors.background : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 38,
                  }}
                >
                  <Text style={{ color: composeMode === 'text' ? colors.text : colors.textSecondary, fontSize: 15, fontWeight: '700' }}>
                    Gửi dạng văn bản
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
