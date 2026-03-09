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
  removeMember
} from '../controllers/chatController.js';
import { upload } from '../middleware/upload.js';
import { Server } from 'socket.io';

export const chatRoutes = (io: Server) => {
  const router = express.Router();

  router.use(authMiddleware);

  router.get('/conversations', getConversations);
  router.post('/group', upload.any(), createGroup(io));
  router.get('/:conversationId', getConversationDetails);
  router.get('/:conversationId/messages', getMessages(io));
  router.post('/:conversationId/messages', sendMessage(io));
  router.post('/:conversationId/read', markAsRead(io));
  router.post('/start', startConversation(io));
  router.delete('/:conversationId', deleteConversation(io));
  router.delete('/:conversationId/disband', disbandGroup(io));
  
  // Group member management
  router.post('/:conversationId/members', addMembers(io));
  router.delete('/:conversationId/members/:userId', removeMember(io));

  return router;
};
