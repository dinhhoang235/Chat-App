import multer from 'multer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DIRECT_UPLOAD_MAX_SIZE_BYTES } from '../constants/upload.js';

// Configure multer storage
const uploadTempDir = path.join(os.tmpdir(), 'chat-app-uploads');
fs.mkdirSync(uploadTempDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadTempDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  // attachments may be any type
  if (file.fieldname === 'file' || file.fieldname === 'attachment') {
    cb(null, true);
    return;
  }

  // otherwise only accept images for avatars/group covers
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: DIRECT_UPLOAD_MAX_SIZE_BYTES,
    files: 2  // Max 2 files (avatar + coverImage)
  }
});
