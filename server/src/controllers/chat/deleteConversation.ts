import { Response } from 'express';
import { Server } from 'socket.io';
import prisma from '../../db.js';
import { AuthRequest } from '../../middleware/auth.js';

export const deleteConversation = (io: Server) => async (req: AuthRequest, res: Response): Promise<any> => {
  const { conversationId } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const convId = parseInt(Array.isArray(conversationId) ? conversationId[0] : conversationId);

    // Check if user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      include: {
        user: {
          select: {
            fullName: true,
            avatar: true
          }
        },
        conversation: true
      }
    });

    if (!participant) {
      return res.status(403).json({ message: 'Not a member of this conversation' });
    }

    const now = new Date();
    const isGroup = !!(participant as any).conversation?.isGroup;

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: convId,
          userId
        }
      },
      data: {
        deletedAt: now,
        hiddenAt: isGroup ? null : now // Nếu là nhóm, không ẩn khỏi danh sách (hiddenAt = null)
      }
    });

    // Notify ONLY the current user that the conversation is "hidden" or "cleared" on their side
    io.to(`user:${userId}`).emit('conversation_deleted', { conversationId: convId, isGroup });

    return res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    return res.status(500).json({ message: 'Error deleting conversation' });
  }
};
