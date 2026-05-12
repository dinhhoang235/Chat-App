export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  LOCATION = 'location',
  CALL = 'call',
  STICKER = 'sticker',
  SEPARATOR = 'separator',
  SYSTEM = 'system',
  CONTACT = 'contact',
  IMAGE_GROUP = 'image_group',
}

export const isMediaType = (type: MessageType): boolean => {
  return [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO, MessageType.FILE].includes(type);
};

export const isFileType = (type: MessageType): boolean => {
  return [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO, MessageType.FILE, MessageType.LOCATION].includes(type);
};
