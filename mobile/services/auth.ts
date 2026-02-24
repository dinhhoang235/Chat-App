import apiClient from './api';

export const authAPI = {
  login: async (phone: string, password: string) => {
    const response = await apiClient.post('/users/login', { phone, password });
    return response.data;
  },

  signup: async (phone: string, fullName: string, password: string) => {
    const response = await apiClient.post('/users/signup', { phone, fullName, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/users/logout');
    return response.data;
  },
};
