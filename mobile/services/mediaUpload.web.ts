import * as FileSystem from 'expo-file-system/legacy';

import { compressImage } from './imageUpload';

export type AttachmentFile = {
  uri: string;
  name: string;
  type: string;
  size?: number;
  duration?: number;
};

export type PreparedAttachment = {
  uploadUri: string;
  uploadName: string;
  uploadSize?: number;
  type: string;
  duration?: number;
};

async function getFileSize(uri: string, fallbackSize?: number) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof (info as any).size === 'number') {
      return (info as any).size as number;
    }
  } catch (error) {
    console.warn('Failed to inspect file size after media preparation:', error);
  }

  return fallbackSize;
}

export async function prepareAttachmentForUpload(file: AttachmentFile): Promise<PreparedAttachment> {
  const isImage = file.type.startsWith('image/');

  const uploadUri = isImage ? await compressImage(file.uri, 'cover') : file.uri;
  const uploadSize = await getFileSize(uploadUri, file.size);

  return {
    uploadUri,
    uploadName: file.name,
    uploadSize,
    type: file.type,
    duration: file.duration,
  };
}