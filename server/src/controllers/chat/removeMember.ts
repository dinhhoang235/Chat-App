import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const removeMember = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId, userId: targetUserIdStr } = req.params;
  const requesterId = req.userId;

  if (!requesterId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);
    const targetUserId = parseInt(Array.isArray(targetUserIdStr) ? targetUserIdStr[0] : targetUserIdStr);

    if (requesterId === targetUserId) {
      return res.status(400).json({ message: 'Cannot remove yourself using this endpoint' });
    }

    // 1. Get requester role
    const requester = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId: requesterId
        }
      },
      include: {
        user: {
          select: { fullName: true }
        }
      }
    });

    if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied. Only owners or admins can remove members.' });
    }

    // 2. Get target role and info
    const target = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId: targetUserId
        }
      },
      include: {
        user: {
          select: { fullName: true }
        }
      }
    });

    if (!target) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    // 3. Check permissions
    // Owner can remove anyone except themselves
    // Admin can remove members, but NOT owner or other admins (based on requirements: "Only the 'owner' can remove other 'admins'")
    if (requester.role === 'admin') {
      if (target.role === 'owner') {
        return res.status(403).json({ message: 'Admins cannot remove the owner' });
      }
      if (target.role === 'admin') {
        return res.status(403).json({ message: 'Admins cannot remove other admins' });
      }
    }

    // Create a "removed from group" system message BEFORE removing the participant
    const systemMessage = await prisma.message.create({
      data: {
        content: `${requester.user.fullName} đã xóa ${target.user.fullName} khỏi nhóm`,
        type: 'system',
        conversationId: convId,
        senderId: null
      }
    });

    // Broadcast system message to everyone in the conversation room
    io.to(`conversation:${convId}`).emit('new_message', {
      ...systemMessage,
      sender: null,
      fromMe: false,
      time: new Date(systemMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contactName: 'Hệ thống'
    });

    // Clear cache to include system message
    // Note: clearCachedMessages is imported if needed, but in original code it was handled with @ts-ignore
    // We should import it from redis for consistency.
    // (I'll add the import to ensure it works)
    
    // 4. Delete the participant
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId: targetUserId
        }
      }
    });

    // 5. Notify participants
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId }
    });

    // Notify remaining members
    participants.forEach(p => {
      io.to(`user:${p.userId}`).emit('conversation_updated', {
        conversationId: convId,
        action: 'member_removed',
        removedUserId: targetUserId
      });
    });

    // Notify the removed member
    io.to(`user:${targetUserId}`).emit('conversation_removed', {
      conversationId: convId,
      reason: 'removed_by_admin'
    });

    return res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    return res.status(500).json({ message: 'Error removing member' });
  }
};
