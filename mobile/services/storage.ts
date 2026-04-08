import * as FileSystem from 'expo-file-system/legacy';
import apiClient from './api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB - Kích thước tối thiểu cho S3 multipart

export const storageApi = {
  /**
   * Lấy Presigned URL để upload file trực tiếp lên MinIO (Single PUT)
   */
  getUploadUrl: async (fileName: string, fileType: string) => {
    const response = await apiClient.post('/storage/upload-url', {
      fileName,
      fileType,
    });
    return response.data;
  },

  /**
   * Khởi tạo multipart upload
   */
  initMultipart: async (fileName: string, fileType: string) => {
    const response = await apiClient.post('/storage/init-multipart', {
      fileName,
      fileType,
    });
    return response.data;
  },

  /**
   * Lấy URL để upload từng part
   */
  getMultipartUrl: async (objectName: string, uploadId: string, partNumber: number) => {
    const response = await apiClient.post('/storage/get-multipart-url', {
      objectName,
      uploadId,
      partNumber,
    });
    return response.data;
  },

  /**
   * Hoàn tất multipart upload
   */
  completeMultipart: async (objectName: string, uploadId: string, parts: { partNumber: number; etag: string }[]) => {
    const response = await apiClient.post('/storage/complete-multipart', {
      objectName,
      uploadId,
      parts,
    });
    return response.data;
  },

  /**
   * Upload file trực tiếp lên URL đã lấy (Single PUT)
   */
  uploadToPresignedUrl: async (uploadUrl: string, fileUri: string, fileType: string) => {
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

  /**
   * Chunked Upload (Multipart Upload) cho file lớn
   */
  uploadFileChunked: async (
    fileUri: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    onProgress?: (progress: number) => void
  ) => {
    try {
      console.log(`[Storage] Starting chunked upload for ${fileName} (${fileSize} bytes)...`);
      
      // 1. Khởi tạo
      const initResult = await storageApi.initMultipart(fileName, fileType);
      const { uploadId, objectName } = initResult;
      console.log(`[Storage] Multipart init success. uploadId: ${uploadId}`);
      
      const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
      const parts = [];

      for (let i = 0; i < totalParts; i++) {
        const partNumber = i + 1;
        const start = i * CHUNK_SIZE;
        const length = Math.min(CHUNK_SIZE, fileSize - start);

        console.log(`[Storage] Uploading part ${partNumber}/${totalParts} (${length} bytes)...`);

        // 2. Lấy link cho part này
        const { uploadUrl } = await storageApi.getMultipartUrl(objectName, uploadId, partNumber);
        console.log(`[Storage] Part ${partNumber} upload URL obtained.`);

        // 3. Đọc chunk và ghi ra file tạm (giúp upload ổn định hơn trên di động)
        const chunkFileUri = `${FileSystem.cacheDirectory}chunk_${partNumber}_${Date.now()}`;
        const base64Chunk = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64' as any,
          position: start,
          length: length,
        });
        await FileSystem.writeAsStringAsync(chunkFileUri, base64Chunk, { encoding: 'base64' as any });

        // 4. Upload part sử dụng cách thức ổn định nhất của Expo
        console.log(`[Storage] Uploading chunk file ${chunkFileUri} to ${uploadUrl.substring(0, 80)}...`);
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, chunkFileUri, {
          httpMethod: 'PUT',
          headers: {
            'Content-Type': fileType || 'application/octet-stream',
          },
        });

        // Xóa file tạm ngay sau khi upload xong (dù thành công hay thất bại)
        await FileSystem.deleteAsync(chunkFileUri, { idempotent: true });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          console.error(`[Storage] Part ${partNumber} upload failed:`, uploadResult.body);
          throw new Error(`Failed to upload part ${partNumber}: ${uploadResult.status} ${uploadResult.body}`);
        }

        // 5. Lưu ETag (cần thiết để hoàn tất upload)
        // Lưu ý: headers của uploadAsync trả về object key-value
        const headers = uploadResult.headers;
        // Case-insensitive check for ETag
        const etag = (headers.etag || headers.ETag || headers.ETAG)?.replace(/"/g, '');
        
        if (!etag) {
          console.error(`[Storage] No ETag returned for part ${partNumber}. Headers:`, JSON.stringify(headers));
          throw new Error(`No ETag for part ${partNumber}`);
        }

        parts.push({ partNumber, etag });
        console.log(`[Storage] Part ${partNumber} finished. ETag: ${etag}`);

        if (onProgress) {
          onProgress(partNumber / totalParts);
        }
      }

      // 6. Hoàn tất
      console.log(`[Storage] Completing multipart upload...`);
      const { finalUrl } = await storageApi.completeMultipart(objectName, uploadId, parts);
      console.log(`[Storage] Upload complete! Final URL: ${finalUrl}`);
      
      return finalUrl;
    } catch (error) {
      console.error('[Storage] uploadFileChunked error:', error);
      throw error;
    }
  },
};
