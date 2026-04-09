import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import apiClient from './api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB - Kích thước tối thiểu cho S3 multipart
const MAX_UPLOAD_RETRIES = 3;
const MIN_MULTIPART_CONCURRENCY = 1;
const MAX_MULTIPART_CONCURRENCY = 5;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runWithRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_UPLOAD_RETRIES) {
        const backoffMs = 500 * Math.pow(2, attempt - 1);
        console.warn(`[Storage] ${label} failed on attempt ${attempt}, retrying in ${backoffMs}ms...`);
        await delay(backoffMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

function getDynamicMultipartConcurrency(fileSize: number, totalParts: number): number {
  const nav = (globalThis as any)?.navigator;
  const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

  let networkSuggested = 3;

  // Web can provide network quality hints via Network Information API.
  if (connection) {
    const effectiveType = String(connection.effectiveType || '').toLowerCase();
    const downlink = Number(connection.downlink || 0);
    const saveData = Boolean(connection.saveData);

    if (saveData || effectiveType.includes('2g')) {
      networkSuggested = 1;
    } else if (effectiveType.includes('3g')) {
      networkSuggested = 2;
    } else if (downlink >= 20) {
      networkSuggested = 5;
    } else if (downlink >= 10 || effectiveType.includes('4g')) {
      networkSuggested = 4;
    }
  }

  // Simple device baseline: iOS tends to handle parallel file I/O slightly better than Android.
  const deviceBase = Platform.OS === 'ios' ? 4 : 3;

  // Keep small uploads conservative to avoid overhead dominating transfer time.
  const smallFileCap = fileSize < 20 * 1024 * 1024 ? 2 : MAX_MULTIPART_CONCURRENCY;

  const resolved = Math.min(networkSuggested, deviceBase, smallFileCap, totalParts, MAX_MULTIPART_CONCURRENCY);
  return Math.max(MIN_MULTIPART_CONCURRENCY, resolved);
}

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
   * Huy multipart upload khi có lỗi giữa chừng
   */
  abortMultipart: async (objectName: string, uploadId: string) => {
    const response = await apiClient.post('/storage/abort-multipart', {
      objectName,
      uploadId,
    });
    return response.data;
  },

  /**
   * Upload file trực tiếp lên URL đã lấy (Single PUT)
   */
  uploadToPresignedUrl: async (uploadUrl: string, fileUri: string, fileType: string) => {
    return runWithRetry(async () => {
      const uploadResponse = await FileSystem.uploadAsync(uploadUrl, fileUri, {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': fileType,
        },
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        throw new Error(`Upload failed with status ${uploadResponse.status}: ${uploadResponse.body}`);
      }

      return uploadResponse;
    }, 'single PUT upload');
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
    let uploadId: string | undefined;
    let objectName: string | undefined;
    let multipartTempFileUris: string[] = [];

    try {
      // 1. Khởi tạo
      const initResult = await storageApi.initMultipart(fileName, fileType);
      uploadId = initResult.uploadId;
      objectName = initResult.objectName;

      if (!uploadId || !objectName) {
        throw new Error('Invalid multipart init response');
      }

      const safeUploadId = uploadId;
      const safeObjectName = objectName;
      
      const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
      const parts: { partNumber: number; etag: string }[] = [];
      let nextPartIndex = 0;
      let completedParts = 0;

      const workerCount = getDynamicMultipartConcurrency(fileSize, totalParts);
      multipartTempFileUris = Array.from({ length: workerCount }, (_, workerIndex) => (
        `${FileSystem.cacheDirectory}multipart_${uploadId}_${workerIndex}_${Date.now()}.tmp`
      ));

      const uploadPart = async (partNumber: number, chunkFileUri: string) => {
        const start = (partNumber - 1) * CHUNK_SIZE;
        const length = Math.min(CHUNK_SIZE, fileSize - start);

        // 2. Lấy link cho part này
        const { uploadUrl } = await storageApi.getMultipartUrl(safeObjectName, safeUploadId, partNumber);

        // 3. Đọc chunk và ghi ra file tạm riêng cho worker
        const base64Chunk = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64' as any,
          position: start,
          length: length,
        });
        await FileSystem.writeAsStringAsync(chunkFileUri, base64Chunk, { encoding: 'base64' as any });

        // 4. Upload part sử dụng cách thức ổn định nhất của Expo
        const uploadResult = await runWithRetry(async () => {
          const result = await FileSystem.uploadAsync(uploadUrl, chunkFileUri, {
            httpMethod: 'PUT',
            headers: {
              'Content-Type': fileType || 'application/octet-stream',
            },
          });

          if (result.status < 200 || result.status >= 300) {
            console.error(`[Storage] Part ${partNumber} upload failed:`, result.body);
            throw new Error(`Failed to upload part ${partNumber}: ${result.status} ${result.body}`);
          }

          return result;
        }, `multipart part ${partNumber}`);

        // 5. Lưu ETag (cần thiết để hoàn tất upload)
        const headers = uploadResult.headers;
        const etag = (headers.etag || headers.ETag || headers.ETAG)?.replace(/"/g, '');

        if (!etag) {
          console.error(`[Storage] No ETag returned for part ${partNumber}. Headers:`, JSON.stringify(headers));
          throw new Error(`No ETag for part ${partNumber}`);
        }

        parts.push({ partNumber, etag });
        completedParts += 1;

        if (onProgress) {
          onProgress((completedParts / totalParts) * 0.95);
        }
      };

      const workers = Array.from({ length: workerCount }, (_, workerIndex) => {
        const workerTempFileUri = multipartTempFileUris[workerIndex];

        return (async () => {
          while (true) {
            const currentIndex = nextPartIndex;
            nextPartIndex += 1;

            if (currentIndex >= totalParts) {
              break;
            }

            const partNumber = currentIndex + 1;
            await uploadPart(partNumber, workerTempFileUri);
          }
        })();
      });

      await Promise.all(workers);
      parts.sort((a, b) => a.partNumber - b.partNumber);

      // 6. Hoàn tất
      if (onProgress) onProgress(0.97); // Gần xong
      const { finalUrl } = await storageApi.completeMultipart(safeObjectName, safeUploadId, parts);
      if (onProgress) onProgress(1.0); // Xong hẳn
      
      return finalUrl;
    } catch (error) {
      console.error('[Storage] uploadFileChunked error:', error);

      if (uploadId && objectName) {
        try {
          await storageApi.abortMultipart(objectName, uploadId);
        } catch (abortError) {
          console.warn('[Storage] Failed to abort multipart upload:', abortError);
        }
      }

      throw error;
    } finally {
      for (const tempFileUri of multipartTempFileUris) {
        await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
      }
    }
  },
};
