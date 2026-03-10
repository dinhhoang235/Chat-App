import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure directories exist
const ensureUploadDir = (uploadDir: string) => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // decide folder based on field name
    let folder = 'avatars';
    if (file.fieldname === 'cover') folder = 'covers';
    if (file.fieldname === 'group_avatar') folder = 'groups';
    if (file.fieldname === 'file' || file.fieldname === 'attachment') folder = 'attachments';

    const uploadDir = path.join(__dirname, '../../media', folder);
    // Ensure directory exists before writing
    ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req.params.id || 'unknown');
    const timestamp = Date.now();
    // preserve original extension when available
    const ext = path.extname(file.originalname) || '.dat';
    const filename = `${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
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
    fileSize: 10 * 1024 * 1024,  // 10MB limit per file
    files: 2  // Max 2 files (avatar + coverImage)
  }
});
