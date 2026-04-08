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
export const getPresignedUrl = async (objectName: string): Promise<string> => {
  // Link có hiệu lực trong 10 phút (600 giây)
  const url = await minioClient.presignedPutObject(bucketName, objectName, 600);
  
  // Trình duyệt/Mobile cần truy cập qua Nginx (localhost / port 80) thay vì port 9000 trực tiếp
  // Chúng ta sẽ thay đổi domain trả về để trỏ vào Nginx proxy
  return url.replace(`:${config.port}`, '').replace(config.endPoint || '', 'localhost'); // Giả định Nginx chạy port 80
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

export default minioClient;
