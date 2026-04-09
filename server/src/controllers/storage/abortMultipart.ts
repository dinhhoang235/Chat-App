import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { abortMultipartUpload } from '../../utils/minio.js';

export const abortMultipart = async (req: AuthRequest, res: Response): Promise<any> => {
  const { objectName, uploadId } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!objectName || !uploadId) {
    return res.status(400).json({ message: 'Missing parameters' });
  }

  if (typeof objectName !== 'string' || !objectName.startsWith(`${userId}/`)) {
    return res.status(403).json({ message: 'Forbidden object access' });
  }

  try {
    await abortMultipartUpload(objectName, uploadId);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Abort multipart error details:', err);
    return res.status(500).json({
      message: 'Error aborting multipart upload',
      error: err.message,
      code: err.code || 'UNKNOWN',
    });
  }
};
