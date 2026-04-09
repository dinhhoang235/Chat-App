import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.js';
import { getPresignedUrlForPart } from '../../utils/minio.js';

export const getMultipartUrl = async (req: AuthRequest, res: Response): Promise<any> => {
  const { objectName, uploadId, partNumber } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!objectName || !uploadId || !partNumber) {
    return res.status(400).json({ message: 'Missing parameters' });
  }

  if (typeof objectName !== 'string' || !objectName.startsWith(`${userId}/`)) {
    return res.status(403).json({ message: 'Forbidden object access' });
  }

  const normalizedPartNumber = Number(partNumber);
  if (!Number.isInteger(normalizedPartNumber) || normalizedPartNumber < 1) {
    return res.status(400).json({ message: 'Invalid partNumber' });
  }

  try {
    const host = req.get('host');
    const uploadUrl = await getPresignedUrlForPart(objectName, uploadId, normalizedPartNumber, host);

    res.json({
      uploadUrl
    });
  } catch (err) {
    console.error('Get multipart URL error:', err);
    res.status(500).json({ message: 'Error generating part upload URL' });
  }
};
