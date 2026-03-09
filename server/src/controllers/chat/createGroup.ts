import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const createGroup = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { name, participantIds } = req.body;
  const userId = req.userId;
  const files = req.files as Express.Multer.File[];

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!name || !participantIds) {
    return res.status(400).json({ message: 'Invalid group data' });
  }

  const pIds = typeof participantIds === 'string' ? JSON.parse(participantIds) : participantIds;

  if (!Array.isArray(pIds) || pIds.length === 0) {
    return res.status(400).json({ message: 'Invalid group data' });
  }

  try {
    let avatarPath = null;
    if (files && files.length > 0) {
      const avatarFile = files.find(f => f.fieldname === 'group_avatar');
      if (avatarFile) {
        avatarPath = `/media/groups/${avatarFile.filename}`;
      }
    }

    // Add current user to participants if not already there
    const allParticipantIds = Array.from(new Set([...pIds.map(id => parseInt(id)), userId]));

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: true,
        name: name,
        avatar: avatarPath,
        participants: {
          create: allParticipantIds.map(id => ({
            userId: id,
            role: id === userId ? 'owner' : 'member'
          }))
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatar: true,
                phone: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Notify all participants about the new group
    allParticipantIds.forEach(id => {
      io.to(`user:${id}`).emit('conversation_updated', {
        conversationId: conversation.id,
        action: 'new_group',
        conversation
      });
    });

    return res.status(201).json(conversation);
  } catch (err) {
    console.error('Create group error:', err);
    return res.status(500).json({ message: 'Error creating group' });
  }
};
