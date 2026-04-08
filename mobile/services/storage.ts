import apiClient from './api';

export const storageApi = {
  /**
   * Lấy Presigned URL để upload file trực tiếp lên MinIO
   */
  getUploadUrl: async (fileName: string, fileType: string) => {
    const response = await apiClient.post('/storage/upload-url', {
      fileName,
      fileType,
    });
    return response.data;
  },

  /**
   * Upload file trực tiếp lên URL đã lấy
   */
  uploadToPresignedUrl: async (uploadUrl: string, fileUri: string, fileType: string) => {
    // Với React Native, Axios có thể không gửi đúng định dạng Blob (gửi thành JSON representation)
    // Sử dụng fetch trực tiếp là cách an toàn nhất
    const response = await fetch(fileUri);
    const blob = await response.blob();

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': fileType,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    return uploadResponse;
  },
};
