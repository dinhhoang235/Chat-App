import apiClient from './api';

export const userAPI = {
  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getUserById: async (id: number) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: number, data: { fullName?: string; avatar?: string; coverImage?: string; bio?: string; gender?: string; dateOfBirth?: string; pushToken?: string | null }) => {
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data;
  },

  updatePushToken: async (id: number, token: string | null) => {
    const response = await apiClient.patch(`/users/${id}`, { pushToken: token });
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  searchUsers: async (query: string) => {
    const response = await apiClient.get('/users/search', {
      params: { query }
    });
    return response.data;
  },

  getSearchHistoryDB: async () => {
    const response = await apiClient.get('/users/search/history');
    return response.data;
  },

  saveSearchHistoryDB: async (searchedUserId: number) => {
    const response = await apiClient.post('/users/search/history', { searchedUserId });
    return response.data;
  },

  removeSearchHistoryDB: async (searchedUserId: number) => {
    const response = await apiClient.post('/users/search/history/remove', { searchedUserId });
    return response.data;
  },

  clearSearchHistoryDB: async () => {
    const response = await apiClient.post('/users/search/history/clear');
    return response.data;
  },
};
