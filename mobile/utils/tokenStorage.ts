import * as SecureStore from "expo-secure-store";
import { log, error } from '@/utils/logger';

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";
const SAVED_ACCOUNTS_KEY = "saved_accounts";

let cachedAccessToken: string | null = null;
let tokenRefreshCallbacks: (() => void)[] = [];

export interface SavedAccount {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export const tokenStorage = {
  // Register callback when token is refreshed
  onTokenRefresh: (callback: () => void) => {
    tokenRefreshCallbacks.push(callback);
    return () => {
      tokenRefreshCallbacks = tokenRefreshCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  },

  // Trigger all refresh callbacks
  notifyTokenRefresh: () => {
    log(
      `[TokenStorage] 🔄 Notifying ${tokenRefreshCallbacks.length} listeners of token refresh`,
    );
    tokenRefreshCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (err) {
        error("[TokenStorage] Error in refresh callback:", err);
      }
    });
  },

  // Initialize cached token from storage (call this on app startup)
  initCachedToken: async () => {
    try {
      if (cachedAccessToken === null) {
        const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (token) {
          cachedAccessToken = token;
          log("[TokenStorage] ✅ Cached token loaded on startup");
        }
      }
    } catch (error) {
      error("[TokenStorage] Failed to init cached token:", error);
    }
  },

  saveTokens: async (accessToken: string, refreshToken: string) => {
    try {
      cachedAccessToken = accessToken;
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      ]);
      // Notify that token was refreshed/updated
      tokenStorage.notifyTokenRefresh();
    } catch (error) {
      error("Error saving tokens:", error);
    }
  },

  getAccessToken: async () => {
    try {
      if (cachedAccessToken !== null) {
        return cachedAccessToken;
      }

      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      cachedAccessToken = token;
      return token;
    } catch (error) {
      error("Error getting access token:", error);
      return null;
    }
  },

  getCachedAccessToken: () => cachedAccessToken,

  setCachedAccessToken: (token: string | null) => {
    cachedAccessToken = token;
  },

  getRefreshToken: async () => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      error("Error getting refresh token:", error);
      return null;
    }
  },

  removeTokens: async () => {
    try {
      cachedAccessToken = null;
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
    } catch (error) {
      error("Error removing tokens:", error);
    }
  },

  // ---- user storage helpers ----
  saveUser: async (user: object) => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      error("Error saving user:", error);
    }
  },

  getUser: async () => {
    try {
      const str = await SecureStore.getItemAsync(USER_KEY);
      return str ? JSON.parse(str) : null;
    } catch (error) {
      error("Error getting user:", error);
      return null;
    }
  },

  removeUser: async () => {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      error("Error removing user:", error);
    }
  },

  clearAll: async () => {
    try {
      cachedAccessToken = null;
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
    } catch (error) {
      error("Error clearing storage:", error);
    }
  },

  // ---- multi-account storage helpers ----
  getSavedAccounts: async (): Promise<SavedAccount[]> => {
    try {
      const str = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
      return str ? JSON.parse(str) : [];
    } catch (error) {
      error("Error getting saved accounts:", error);
      return [];
    }
  },

  addSavedAccount: async (
    user: any,
    accessToken: string,
    refreshToken: string,
  ) => {
    try {
      const accounts = await tokenStorage.getSavedAccounts();
      const existingIndex = accounts.findIndex((a) => a.user.id === user.id);

      const newAccount = { user, accessToken, refreshToken };
      if (existingIndex >= 0) {
        accounts[existingIndex] = newAccount;
      } else {
        accounts.push(newAccount);
      }

      await SecureStore.setItemAsync(
        SAVED_ACCOUNTS_KEY,
        JSON.stringify(accounts),
      );
    } catch (error) {
      error("Error adding saved account:", error);
    }
  },

  removeSavedAccount: async (userId: number) => {
    try {
      const accounts = await tokenStorage.getSavedAccounts();
      const filtered = accounts.filter((a) => a.user.id !== userId);
      await SecureStore.setItemAsync(
        SAVED_ACCOUNTS_KEY,
        JSON.stringify(filtered),
      );
    } catch (error) {
      error("Error removing saved account:", error);
    }
  },
};
