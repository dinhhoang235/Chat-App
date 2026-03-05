import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { 
  getConversations, 
  getMessages, 
  sendMessage, 
  startConversation 
} from '../controllers/chatController.js';
import { Server } from 'socket.io';

export const chatRoutes = (io: Server) => {
  const router = express.Router();

  router.use(authMiddleware);

  router.get('/conversations', getConversations);
  router.get('/:conversationId/messages', getMessages(io));
  router.post('/:conversationId/messages', sendMessage(io));
  router.post('/start', startConversation(io));

  return router;
};
