import multer from 'multer';

// Configure multer storage
const storage = multer.memoryStorage();

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
