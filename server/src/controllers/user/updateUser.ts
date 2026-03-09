import { Request, Response } from 'express';
import prisma from '../../db.js';
import fs from 'fs';

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = parseInt(id as string);
    const files = (req as any).files || [];

    // Handle multipart/form-data where req.body might be undefined
    const body = req.body || {};
    const { fullName, bio, gender, dateOfBirth } = body;

    // Get current user to check old images
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, coverImage: true }
    });

    // Only include fields that are provided
    const data: any = {};
    if (fullName !== undefined && fullName !== null && fullName !== '') data.fullName = fullName;
    if (bio !== undefined && bio !== null) data.bio = bio;
    if (gender !== undefined && gender !== null && gender !== '') data.gender = gender;
    if (dateOfBirth !== undefined && dateOfBirth !== null) data.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;

    // Handle file uploads
    for (const file of files) {
      const fieldName = file.fieldname; // 'avatar' or 'coverImage'
      const filePath = `/media/${fieldName === 'avatar' ? 'avatars' : 'covers'}/${file.filename}`;
      
      data[fieldName] = filePath;

      // Delete old file if it exists
      if (fieldName === 'avatar' && currentUser?.avatar) {
        try {
          // Reconstruct file system path from media path
          const mediaPath = currentUser.avatar.replace('/media/', '');
          const fullPath = `${__dirname}/../../media/${mediaPath}`;
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      } else if (fieldName === 'coverImage' && currentUser?.coverImage) {
        try {
          // Reconstruct file system path from media path
          const mediaPath = currentUser.coverImage.replace('/media/', '');
          const fullPath = `${__dirname}/../../media/${mediaPath}`;
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (err) {
          console.error('Error deleting old cover image:', err);
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        fullName: true,
        avatar: true,
        coverImage: true,
        bio: true,
        gender: true,
        dateOfBirth: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    if (err instanceof Error) {
      res.status(500).json({ error: 'Failed to update user', details: err.message });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
};
