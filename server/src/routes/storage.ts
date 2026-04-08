import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getUploadUrl } from '../controllers/storage/getUploadUrl.js';

const router = Router();

// Lấy link upload (Presigned URL)
router.post('/upload-url', authMiddleware, getUploadUrl);

export default router;
