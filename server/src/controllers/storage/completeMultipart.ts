import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { completeMultipartUpload } from '../../utils/minio.js';

export const completeMultipart = async (req: AuthRequest, res: Response): Promise<any> => {
  const { objectName, uploadId, parts } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!objectName || !uploadId || !Array.isArray(parts) || parts.length === 0) {
    return res.status(400).json({ message: 'Missing parameters' });
  }

  if (typeof objectName !== 'string' || !objectName.startsWith(`${userId}/`)) {
    return res.status(403).json({ message: 'Forbidden object access' });
  }

  try {
    console.log(`Completing multipart upload for ${objectName}, uploadId: ${uploadId}`);
    await completeMultipartUpload(objectName, uploadId, parts);
    console.log('Multipart upload completed successfully');
    
    const finalUrl = `/storage/${process.env.MINIO_BUCKET}/${objectName}`;

    res.json({
      success: true,
      finalUrl
    });
  } catch (err: any) {
    console.error('Complete multipart error details:', err);
    res.status(500).json({ 
      message: 'Error completing multipart upload',
      error: err.message,
      code: err.code || 'UNKNOWN'
    });
  }
};
