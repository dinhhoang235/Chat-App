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

  updateUser: async (id: number, data: { fullName?: string; avatar?: string; bio?: string }) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};
