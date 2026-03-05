import apiClient from './api';

export const chatApi = {
  getConversations: () => apiClient.get('/chats/conversations'),
  getMessages: (id: string | number) => apiClient.get(`/chats/${id}/messages`),
  sendMessage: (id: string | number, content: string, type: string = 'text') => 
    apiClient.post(`/chats/${id}/messages`, { content, type }),
  startConversation: (targetUserId: number) => apiClient.post('/chats/start', { targetUserId }),
};
