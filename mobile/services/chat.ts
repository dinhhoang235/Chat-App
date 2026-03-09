import apiClient from './api';

export const chatApi = {
  getConversations: () => apiClient.get('/chats/conversations'),
  getConversationDetails: (id: string | number) => apiClient.get(`/chats/${id}`),
  getMessages: (id: string | number, cursor?: number, limit: number = 20) => 
    apiClient.get(`/chats/${id}/messages`, { params: { cursor, limit } }),
  sendMessage: (id: string | number, content: string, type: string = 'text') => 
    apiClient.post(`/chats/${id}/messages`, { content, type }),
  markAsRead: (id: string | number) => 
    apiClient.post(`/chats/${id}/read`),
  startConversation: (targetUserId: number, firstMessage?: string) => 
    apiClient.post('/chats/start', { targetUserId, firstMessage }),
  deleteConversation: (id: string | number) => 
    apiClient.delete(`/chats/${id}`),
  createGroup: (name: string, participantIds: (string | number)[], avatarUri?: string) => {
    if (avatarUri) {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('participantIds', JSON.stringify(participantIds));
      formData.append('group_avatar', {
        uri: avatarUri,
        type: 'image/jpeg',
        name: 'group_avatar.jpg',
      } as any);

      return apiClient.post('/chats/group', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });
    }
    return apiClient.post('/chats/group', { name, participantIds });
  },
  addMembers: (id: string | number, userIds: (string | number)[]) =>
    apiClient.post(`/chats/${id}/members`, { userIds }),
  removeMember: (id: string | number, userId: string | number) =>
    apiClient.delete(`/chats/${id}/members/${userId}`),
  disbandGroup: (id: string | number) =>
    apiClient.delete(`/chats/${id}/disband`),
};
