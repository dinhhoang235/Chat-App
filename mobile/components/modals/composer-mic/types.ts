export type VoiceAttachment = {
  uri: string;
  name: string;
  type: string;
  duration?: number;
  waveform?: number[];
};

export type ComposeMode = 'audio' | 'text';

export type ComposerMicColors = {
  text: string;
  textSecondary: string;
  tint: string;
  surface: string;
  surfaceVariant: string;
  background: string;
};
