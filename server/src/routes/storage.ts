import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getUploadUrl } from '../controllers/storage/getUploadUrl.js';
import { initMultipart } from '../controllers/storage/initMultipart.js';
import { getMultipartUrl } from '../controllers/storage/getMultipartUrl.js';
import { completeMultipart } from '../controllers/storage/completeMultipart.js';

const router = Router();

// Lấy link upload (Presigned URL) - Single PUT
router.post('/upload-url', authMiddleware, getUploadUrl);

// Multipart Upload (Chunked)
router.post('/init-multipart', authMiddleware, initMultipart);
router.post('/get-multipart-url', authMiddleware, getMultipartUrl);
router.post('/complete-multipart', authMiddleware, completeMultipart);

export default router;
