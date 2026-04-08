import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { initMultipartUpload } from '../../utils/minio.js';
import path from 'path';
import { randomUUID } from 'crypto';

export const initMultipart = async (req: AuthRequest, res: Response): Promise<any> => {
  const { fileName } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!fileName) {
    return res.status(400).json({ message: 'Missing fileName' });
  }

  try {
    const { fileType } = req.body;
    const ext = path.extname(fileName);
    const objectName = `${userId}/${randomUUID()}${ext}`;
    
    console.log(`Initializing multipart upload for ${objectName}...`);
    const uploadId = await initMultipartUpload(objectName, {
      'Content-Type': fileType || 'application/octet-stream'
    });
    console.log(`Init successful, uploadId: ${uploadId}`);

    res.json({
      uploadId,
      objectName
    });
  } catch (err) {
    console.error('Init multipart error:', err);
    res.status(500).json({ message: 'Error initiating multipart upload' });
  }
};
