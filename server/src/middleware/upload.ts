import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../media', 
      file.fieldname === 'avatar' ? 'avatars' : 'covers'
    );
    cb(null, uploadDir);
  },
  filename: (req, _file, cb) => {
    const userId = (req.params.id || 'unknown');
    const timestamp = Date.now();
    const filename = `${userId}_${timestamp}.jpg`;
    cb(null, filename);
  }
});

const fileFilter = (_req: any, file: any, cb: any) => {
  // Only accept image files
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
