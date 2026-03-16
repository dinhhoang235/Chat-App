import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { 
  getConversations, 
  getMessages, 
  sendMessage, 
  startConversation,
  markAsRead,
  deleteConversation,
  disbandGroup,
  createGroup,
  getConversationDetails,
  addMembers,
  removeMember,
  leaveGroup,
  getConversationMedia,
  muteConversation,
  pinConversation,
  markAsUnread
} from '../controllers/chat/index.js';
import { upload } from '../middleware/upload.js';
import { Server } from 'socket.io';

export const chatRoutes = (io: Server) => {
  const router = express.Router();

  router.use(authMiddleware);

  router.get('/conversations', getConversations);
  router.post('/group', upload.any(), createGroup(io));
  router.get('/:conversationId', getConversationDetails);
  router.get('/:conversationId/media', getConversationMedia);
  router.get('/:conversationId/messages', getMessages(io));
  // messages can include a file attachment under fieldname 'file'
  router.post('/:conversationId/messages', upload.single('file'), sendMessage(io));
  router.post('/:conversationId/read', markAsRead(io));
  // starting a conversation may also include an initial attachment
  router.post('/start', upload.single('file'), startConversation(io));
  router.delete('/:conversationId', deleteConversation(io));
  router.delete('/:conversationId/disband', disbandGroup(io));
  router.delete('/:conversationId/leave', leaveGroup(io));
  
  // Group member management
  router.post('/:conversationId/members', addMembers(io));
  router.delete('/:conversationId/members/:userId', removeMember(io));
  router.post('/:conversationId/mute', muteConversation);
  router.post('/:conversationId/pin', pinConversation);
  router.post('/:conversationId/unread', markAsUnread(io));

  return router;
};
