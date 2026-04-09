import * as FileSystem from 'expo-file-system/legacy';
import { Video } from 'react-native-compressor';

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

const VIDEO_COMPRESSION_MIN_SIZE_BYTES = 8 * 1024 * 1024;

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

async function compressVideoIfNeeded(file: AttachmentFile) {
  if (!file.size || file.size < VIDEO_COMPRESSION_MIN_SIZE_BYTES) {
    return file.uri;
  }

  try {
    const compressedUri = await Video.compress(file.uri, {
      compressionMethod: 'auto',
      minimumFileSizeForCompress: VIDEO_COMPRESSION_MIN_SIZE_BYTES,
      progressDivider: 10,
    });

    return compressedUri || file.uri;
  } catch (error) {
    console.warn('Video compression failed, using original file:', error);
    return file.uri;
  }
}

export async function prepareAttachmentForUpload(file: AttachmentFile): Promise<PreparedAttachment> {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  let uploadUri = file.uri;
  if (isImage) {
    uploadUri = await compressImage(file.uri, 'cover');
  } else if (isVideo) {
    uploadUri = await compressVideoIfNeeded(file);
  }

  const uploadSize = await getFileSize(uploadUri, file.size);

  return {
    uploadUri,
    uploadName: file.name,
    uploadSize,
    type: file.type,
    duration: file.duration,
  };
}