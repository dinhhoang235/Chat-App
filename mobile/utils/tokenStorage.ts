import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";

export const tokenStorage = {
  saveTokens: async (accessToken: string, refreshToken: string) => {
    try {
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);
    } catch (error) {
      console.error("Error saving tokens:", error);
    }
  },

  getAccessToken: async () => {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  },

  getRefreshToken: async () => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error("Error getting refresh token:", error);
      return null;
    }
  },

  removeTokens: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
    } catch (error) {
      console.error("Error removing tokens:", error);
    }
  },

  // ---- user storage helpers ----
  saveUser: async (user: object) => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Error saving user:", error);
    }
  },

  getUser: async () => {
    try {
      const str = await SecureStore.getItemAsync(USER_KEY);
      return str ? JSON.parse(str) : null;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  },

  removeUser: async () => {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error("Error removing user:", error);
    }
  },

  clearAll: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  },
};
