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

  updateUser: async (id: number, data: { fullName?: string; avatar?: string; coverImage?: string; bio?: string; gender?: string; dateOfBirth?: string }) => {
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};
