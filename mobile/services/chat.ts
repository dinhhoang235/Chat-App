import apiClient from './api';
import { Platform } from 'react-native';

export const chatApi = {
  getConversations: () => apiClient.get('/chats/conversations'),
  getConversationDetails: (id: string | number) => apiClient.get(`/chats/${id}`),
  getConversationMedia: (id: string | number, cursor?: number, limit: number = 20) => 
    apiClient.get(`/chats/${id}/media`, { params: { cursor, limit } }),
  getMessages: (id: string | number, cursor?: number, limit: number = 20) => 
    apiClient.get(`/chats/${id}/messages`, { params: { cursor, limit } }),
  sendMessage: (id: string | number, content: string, type: string = 'text', file?: any, replyToId?: string | number) => {
    if (file) {
      const formData = new FormData();
      if (content) formData.append('content', content);
      if (replyToId) formData.append('replyToId', replyToId.toString());
      // ensure file object is proper for RN
      let upload = file;
      if (file.uri) {
        upload = {
          uri: Platform.OS === 'ios' && file.uri.startsWith('file://') ? file.uri.replace('file://', '') : file.uri,
          name: file.name || 'upload',
          type: file.type || 'application/octet-stream',
        };
      }
      formData.append('file', upload as any);
      // type will be inferred on server
      return apiClient.post(`/chats/${id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });
    }
    const body: any = { content, type };
    if (replyToId) body.replyToId = replyToId;
    return apiClient.post(`/chats/${id}/messages`, body);
  },

  markAsRead: (id: string | number) => 
    apiClient.post(`/chats/${id}/read`),
  startConversation: (targetUserId: number, firstMessage?: string, file?: any) => {
    if (file) {
      const formData = new FormData();
      formData.append('targetUserId', targetUserId.toString());
      if (firstMessage) formData.append('firstMessage', firstMessage);
      let upload = file;
      if (file.uri) {
        upload = {
          uri: Platform.OS === 'ios' && file.uri.startsWith('file://') ? file.uri.replace('file://', '') : file.uri,
          name: file.name || 'upload',
          type: file.type || 'application/octet-stream',
        };
      }
      formData.append('file', upload as any);
      return apiClient.post('/chats/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: (data) => data,
      });
    }
    return apiClient.post('/chats/start', { targetUserId, firstMessage });
  },
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
  leaveGroup: (id: string | number) =>
    apiClient.delete(`/chats/${id}/leave`),
  muteConversation: (id: string | number, mutedUntil: Date | null) =>
    apiClient.post(`/chats/${id}/mute`, { mutedUntil }),
  pinConversation: (id: string | number, pinned: boolean) =>
    apiClient.post(`/chats/${id}/pin`, { pinned }),
  markAsUnread: (id: string | number) =>
    apiClient.post(`/chats/${id}/unread`),
  searchMessages: (id: string | number, query: string) =>
    apiClient.get(`/chats/${id}/search`, { params: { q: query } }),
};
