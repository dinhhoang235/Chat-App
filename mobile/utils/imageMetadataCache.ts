type ImageMetadata = {
  thumbnailUrl?: string;
  width?: number;
  height?: number;
};

const imageMetadataCache = new Map<string, ImageMetadata>();

export const getImageMetadata = (messageId: string | number) => {
  return imageMetadataCache.get(messageId.toString()) || null;
};

export const setImageMetadata = (
  messageId: string | number,
  metadata: ImageMetadata,
) => {
  const key = messageId.toString();
  const current = imageMetadataCache.get(key) || {};
  imageMetadataCache.set(key, { ...current, ...metadata });
};
