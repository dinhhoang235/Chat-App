import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEDIA_DIR = path.join(__dirname, '../../media');
const AVATARS_DIR = path.join(MEDIA_DIR, 'avatars');
const COVERS_DIR = path.join(MEDIA_DIR, 'covers');

// Ensure directories exist
const ensureDirectories = () => {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });
  if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
};

ensureDirectories();

// Delete image file from disk
export const deleteImage = (imagePath: string | null): boolean => {
  if (!imagePath) return true;

  try {
    const fullPath = path.join(MEDIA_DIR, '..', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};
