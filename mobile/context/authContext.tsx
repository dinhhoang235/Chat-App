import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "@/services/auth";
import { tokenStorage, SavedAccount } from "@/utils/tokenStorage";
import { socketService } from "@/services/socket";
import { userAPI } from "@/services/user";

interface AuthContextType {
  isLoggedIn: boolean;
  initialized: boolean; // true once hydration from storage finished
  user: { id: number; phone: string; fullName: string; avatar?: string; coverImage?: string; bio?: string; gender?: string | null; dateOfBirth?: string | null } | null;
  savedAccounts: SavedAccount[];
  login: (phone: string, password: string) => Promise<boolean>;
  signup: (phone: string, fullName: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<{ fullName: string; avatar?: string; coverImage?: string; bio?: string; gender?: string | null; dateOfBirth?: string | null }>) => void;
  switchAccount: (account: SavedAccount) => Promise<void>;
  removeAccount: (userId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<{ id: number; phone: string; fullName: string; avatar?: string; coverImage?: string; bio?: string; gender?: string | null; dateOfBirth?: string | null } | null>(
    null
  );
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  const loadSavedAccounts = async () => {
    const accounts = await tokenStorage.getSavedAccounts();
    setSavedAccounts(accounts);
  };

  // restore login state when the provider mounts
  useEffect(() => {
    (async () => {
      const access = await tokenStorage.getAccessToken();
      const storedUser = await tokenStorage.getUser();
      if (access && storedUser) {
        setIsLoggedIn(true);
        setUser(storedUser);
      } else {
        // make sure no leftover data remain
        await tokenStorage.removeTokens();
        await tokenStorage.removeUser();
      }
      await loadSavedAccounts();
      setInitialized(true);
    })();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [isLoggedIn]);

  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      const data = await authAPI.login(phone, password);
      if (data.success && data.user && data.accessToken && data.refreshToken) {
        setIsLoggedIn(true);
        setUser(data.user);
        await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
        await tokenStorage.saveUser(data.user);
        await tokenStorage.addSavedAccount(data.user, data.accessToken, data.refreshToken);
        await loadSavedAccounts();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const signup = async (
    phone: string,
    fullName: string,
    password: string
  ): Promise<boolean> => {
    try {
      const data = await authAPI.signup(phone, fullName, password);
      if (data.success && data.user && data.accessToken && data.refreshToken) {
        setIsLoggedIn(true);
        setUser(data.user);
        await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
        await tokenStorage.saveUser(data.user);
        await tokenStorage.addSavedAccount(data.user, data.accessToken, data.refreshToken);
        await loadSavedAccounts();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Signup error:", error);
      return false;
    }
  };

  const updateProfile = (data: Partial<{ fullName: string; avatar?: string; coverImage?: string; bio?: string; gender?: string | null; dateOfBirth?: string | null }>) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...data };
    });
  };

  const logout = async () => {
    try {
      // If user exists, clear their push token on backend before local cleanup
      if (user) {
        await userAPI.updatePushToken(user.id, null);
      }
    } catch (error) {
      console.error("Logout cleanup error:", error);
    }
    
    // Always do local cleanup
    setIsLoggedIn(false);
    setUser(null);
    await Promise.all([tokenStorage.removeTokens(), tokenStorage.removeUser()]);
  };

  const switchAccount = async (account: SavedAccount) => {
    setIsLoggedIn(true);
    setUser(account.user);
    await tokenStorage.saveTokens(account.accessToken, account.refreshToken);
    await tokenStorage.saveUser(account.user);
    await tokenStorage.addSavedAccount(account.user, account.accessToken, account.refreshToken);
    await loadSavedAccounts();
  };

  const removeAccount = async (userId: number) => {
    await tokenStorage.removeSavedAccount(userId);
    await loadSavedAccounts();
    
    // If we removed the currently active account, log out
    if (user?.id === userId) {
      await logout();
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, initialized, user, savedAccounts, login, signup, logout, updateProfile, switchAccount, removeAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
