import React, { createContext, useState, useContext } from "react";
import { authAPI } from "../services/auth";
import { tokenStorage } from "../utils/tokenStorage";

interface AuthContextType {
  isLoggedIn: boolean;
  user: { id: number; phone: string; fullName: string; avatar?: string; coverImage?: string; bio?: string; gender?: string | null; dateOfBirth?: string | null } | null;
  login: (phone: string, password: string) => Promise<boolean>;
  signup: (phone: string, fullName: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<{ fullName: string; avatar?: string; coverImage?: string; bio?: string; gender?: string | null; dateOfBirth?: string | null }>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: number; phone: string; fullName: string; avatar?: string; coverImage?: string; bio?: string; gender?: string | null; dateOfBirth?: string | null } | null>(
    null
  );

  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      const data = await authAPI.login(phone, password);
      if (data.success && data.user && data.accessToken && data.refreshToken) {
        setIsLoggedIn(true);
        setUser(data.user);
        await tokenStorage.saveTokens(data.accessToken, data.refreshToken);
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
    setIsLoggedIn(false);
    setUser(null);
    await tokenStorage.removeTokens();
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, signup, logout, updateProfile }}>
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
