import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import path from 'path';

// 1. Lấy cấu hình từ biến môi trường
const config = {
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ROOT_USER,
  secretKey: process.env.MINIO_ROOT_PASSWORD,
  bucketName: process.env.MINIO_BUCKET,
  region: process.env.MINIO_REGION || 'us-east-1'
};

// 2. Kiểm tra các tham số bắt buộc
if (!config.endPoint || !config.accessKey || !config.secretKey || !config.bucketName) {
  console.warn('⚠️ CẢNH BÁO: Thiếu các biến môi trường cho MinIO. Kiểm tra lại file .env');
}

const minioClient = new Minio.Client({
  endPoint: config.endPoint || 'localhost',
  port: config.port,
  useSSL: config.useSSL,
  accessKey: config.accessKey || '',
  secretKey: config.secretKey || '',
});

const bucketName = config.bucketName || 'chatapp';

// 3. Khởi tạo bucket và policy
export const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      // Sử dụng region từ config
      await minioClient.makeBucket(bucketName, config.region);
      console.log(`✅ MinIO: Bucket '${bucketName}' đã được tạo thành công.`);
      
      const policyResponse = {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['s3:GetBucketLocation', 's3:ListBucket'],
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Resource: [`arn:aws:s3:::${bucketName}`],
          },
          {
            Action: ['s3:GetObject'],
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policyResponse));
    }
  } catch (err) {
    console.error('❌ Lỗi khởi tạo MinIO:', err);
  }
};

// 4. Tạo Presigned URL để upload trực tiếp từ Client
export const getPresignedUrl = async (objectName: string, requestHost?: string): Promise<string> => {
  // Link có hiệu lực trong 10 phút (600 giây)
  // Sử dụng presignedUrl('PUT') để linh hoạt hơn
  const url = await minioClient.presignedUrl('PUT', bucketName, objectName, 600);
  
  let requestHostResult = 'localhost';
  if (requestHost) {
    requestHostResult = requestHost.split(':')[0];
  }

  // Thay thế domain nội bộ bằng domain/IP mà Client có thể kết nối
  // Quan trọng: Chèn /storage để đi qua proxy Nginx
  let rewrittenUrl = url.replace(config.endPoint || 'minio', requestHostResult);
  
  // Nginx proxy của chúng ta map /storage/ -> minio:9000/
  // URL gốc: http://minio:9000/chatapp/file.jpg
  // URL mới: http://domain/storage/chatapp/file.jpg
  return rewrittenUrl.replace(requestHostResult, `${requestHostResult}/storage`).replace(`:${config.port}`, '');
};

export const uploadFile = async (file: Express.Multer.File): Promise<{ url: string; fileName: string }> => {
  // Dùng UUID + extension gốc để tránh lỗi ký tự đặc biệt trong tên file
  const ext = path.extname(file.originalname) || '';
  const fileName = `${randomUUID()}${ext}`;
  await minioClient.putObject(bucketName, fileName, file.buffer, file.size, {
    'Content-Type': file.mimetype,
  });

  // Trả về url và fileName để dùng làm tên hiển thị (không dùng originalname)
  return {
    url: `/storage/${bucketName}/${fileName}`,
    fileName,
  };
};

export const initMultipartUpload = async (objectName: string, metadata?: Minio.ItemBucketMetadata): Promise<string> => {
  try {
    // Minio SDK 8.x uses initiateNewMultipartUpload internally
    // @ts-ignore
    const method = minioClient.initiateNewMultipartUpload || minioClient.initiateMultipartUpload;
    if (typeof method !== 'function') {
      console.error('Multipart initiation method not found on minioClient');
      throw new Error('Multipart upload not supported');
    }
    
    // @ts-ignore
    const uploadId = await method.call(minioClient, bucketName, objectName, metadata || {});
    return uploadId;
  } catch (error) {
    console.error('Error in initMultipartUpload:', error);
    throw error;
  }
};

export const getPresignedUrlForPart = async (objectName: string, uploadId: string, partNumber: number, requestHost?: string): Promise<string> => {
  // S3 requires 'uploadId' and 'partNumber' query params
  const url = await minioClient.presignedUrl('PUT', bucketName, objectName, 600, {
    uploadId,
    partNumber: partNumber.toString()
  });

  let requestHostResult = 'localhost';
  if (requestHost) {
    requestHostResult = requestHost.split(':')[0];
  }

  let rewrittenUrl = url.replace(config.endPoint || 'minio', requestHostResult);
  return rewrittenUrl.replace(requestHostResult, `${requestHostResult}/storage`).replace(`:${config.port}`, '');
};

export const completeMultipartUpload = async (
  objectName: string,
  uploadId: string,
  parts: Array<{ partNumber?: number; part?: number; etag?: string }>
): Promise<void> => {
  // MinIO SDK expects each part item to have shape: { part: number, etag: string }
  const normalizedParts = parts
    .map((p) => {
      const part = Number(p.part ?? p.partNumber);
      const etag = (p.etag || '').replace(/"/g, '');
      return { part, etag };
    })
    .filter((p) => Number.isInteger(p.part) && p.part > 0 && Boolean(p.etag))
    .sort((a, b) => a.part - b.part);

  if (normalizedParts.length === 0) {
    throw new Error('No valid multipart parts to complete upload');
  }
    
  // @ts-ignore
  const method = minioClient.completeMultipartUpload;
  
  try {
    // @ts-ignore
    await method.call(minioClient, bucketName, objectName, uploadId, normalizedParts);
  } catch (error) {
    console.error('MinIO internal completeMultipartUpload error:', error);
    throw error;
  }
};

export default minioClient;
