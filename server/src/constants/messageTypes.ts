export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  LOCATION: 'location',
  CALL: 'call',
  STICKER: 'sticker',
  SYSTEM: 'system',
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

export const MEDIA_TYPES = [
  MESSAGE_TYPES.IMAGE,
  MESSAGE_TYPES.VIDEO,
  MESSAGE_TYPES.FILE,
  MESSAGE_TYPES.AUDIO,
] as const;

export const FILE_TYPES = [
  MESSAGE_TYPES.IMAGE,
  MESSAGE_TYPES.VIDEO,
  MESSAGE_TYPES.FILE,
  MESSAGE_TYPES.AUDIO,
] as const;
