import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { getPresignedUrl } from '../../utils/minio.js';
import path from 'path';
import { randomUUID } from 'crypto';

export const getUploadUrl = async (req: AuthRequest, res: Response): Promise<any> => {
  const { fileName, fileType } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!fileName) {
    return res.status(400).json({ message: 'Missing fileName' });
  }

  try {
    // Dùng UUID + extension để tránh tên file có ký tự đặc biệt
    const ext = path.extname(fileName);
    const objectName = `${userId}/${randomUUID()}${ext}`;
    
    const host = req.get('host');
    
    // Lấy link upload (Presigned URL)
    const uploadUrl = await getPresignedUrl(objectName, host);
    
    // Link để xem file sau khi upload thành công (Link công khai qua Nginx)
    const finalUrl = `/storage/${process.env.MINIO_BUCKET}/${objectName}`;

    res.json({
      uploadUrl,
      finalUrl,
      method: 'PUT',
      headers: {
        'Content-Type': fileType || 'application/octet-stream'
      }
    });
  } catch (err) {
    console.error('Presigned URL error:', err);
    res.status(500).json({ message: 'Error generating upload URL' });
  }
};
