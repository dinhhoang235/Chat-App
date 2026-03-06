import apiClient from './api';

export const chatApi = {
  getConversations: () => apiClient.get('/chats/conversations'),
  getMessages: (id: string | number, cursor?: number, limit: number = 20) => 
    apiClient.get(`/chats/${id}/messages`, { params: { cursor, limit } }),
  sendMessage: (id: string | number, content: string, type: string = 'text') => 
    apiClient.post(`/chats/${id}/messages`, { content, type }),
  startConversation: (targetUserId: number, firstMessage?: string) => 
    apiClient.post('/chats/start', { targetUserId, firstMessage }),
};
