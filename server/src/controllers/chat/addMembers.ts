import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';
import { clearCachedMessages } from '../../utils/redis.js';

export const addMembers = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const { userIds } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty userIds' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);

    // Check if group exists and if requester is owner/admin
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      include: {
        conversation: true
      }
    });

    if (!participant || !participant.conversation.isGroup) {
      return res.status(403).json({ message: 'Only group members can add new members' });
    }

    if (participant.role !== 'owner' && participant.role !== 'admin') {
      return res.status(403).json({ message: 'Permission denied. Only owners or admins can add members.' });
    }

    // Filter out existing participants
    const existingParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: convId,
        userId: { in: userIds.map(id => parseInt(id)) }
      }
    });

    const existingUserIds = existingParticipants.map(p => p.userId);
    const newUserIds = userIds
      .map(id => parseInt(id))
      .filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      return res.status(400).json({ message: 'All selected users are already in the group' });
    }

    // Use a transaction to ensure clean state for new members
    await prisma.$transaction(async (tx) => {
      // Add new participants
      await tx.conversationParticipant.createMany({
        data: newUserIds.map(id => ({
          conversationId: convId,
          userId: id,
          role: 'member',
          joinedAt: new Date(),
          deletedAt: new Date() // Sét trực tiếp ở đây cho thành viên MỚI
        }))
      });
    });

    // Fetch the updated group details to notify users
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: convId },
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
        }
      }
    });

    if (updatedConversation) {
      // 1. Get the names of added users to create system messages
      const newMembers = await prisma.user.findMany({
        where: { id: { in: newUserIds } },
        select: { fullName: true }
      });

      const requesterRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true }
      });

      // 2. Create system messages for each added member
      for (const member of newMembers) {
        const systemMessage = await prisma.message.create({
          data: {
            content: `${member.fullName} đã được ${requesterRecord?.fullName || 'trưởng nhóm'} thêm vào nhóm`,
            type: 'system',
            conversationId: convId,
            senderId: null // System message has no sender
          }
        });

        // Broadcast each system message
        io.to(`conversation:${convId}`).emit('new_message', {
          ...systemMessage,
          sender: null,
          fromMe: false,
          time: new Date(systemMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contactName: 'Hệ thống'
        });
      }

      // 3. Clear cache so the next getMessages call fetches new system messages
      clearCachedMessages(convId).catch(e => console.error('Clear cache error:', e));

      // 4. Notify all current participants about the new members (for UI updates like member list)
      updatedConversation.participants.forEach(p => {
        io.to(`user:${p.userId}`).emit('conversation_updated', {
          conversationId: convId,
          action: 'members_added',
          conversation: updatedConversation,
          newMemberIds: newUserIds
        });
      });
    }

    return res.status(200).json({ success: true, addedCount: newUserIds.length });
  } catch (err) {
    console.error('Add members error:', err);
    return res.status(500).json({ message: 'Error adding members' });
  }
};
