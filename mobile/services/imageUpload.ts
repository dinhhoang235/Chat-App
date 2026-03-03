import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import apiClient from './api';

export type ImageType = 'avatar' | 'cover';

interface ImageUploadOptions {
  imageUri: string;
  type: ImageType;
  userId: number;
}

export const compressImage = async (imageUri: string, type: ImageType) => {
  try {
    const isAvatar = type === 'avatar';

    const imageRef = await ImageManipulator.manipulate(imageUri)
      .resize({ width: isAvatar ? 600 : 1440 })
      .renderAsync();

    const result = await imageRef.saveAsync({
      compress: isAvatar ? 0.92 : 0.95,
      format: SaveFormat.JPEG,
    });

    return result.uri;
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return imageUri;
  }
};

export const uploadImage = async ({ imageUri, type, userId }: ImageUploadOptions) => {
  try {
    // Compress image
    const compressedUri = await compressImage(imageUri, type);

    // React Native FormData with file object
    const formData = new FormData();
    const fieldName = type === 'avatar' ? 'avatar' : 'coverImage';
    
    formData.append(fieldName, {
      uri: compressedUri,
      type: 'image/jpeg',
      name: `${type}.jpg`,
    } as any);

    const uploadResponse = await apiClient.patch(`/users/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Prevent axios from JSON-serializing the FormData
      transformRequest: (data) => data,
    });

    return { success: true, data: uploadResponse.data };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
