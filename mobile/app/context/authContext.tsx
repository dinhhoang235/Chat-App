import React, { createContext, useState, useContext } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  user: { phone: string; fullName: string } | null;
  login: (phone: string, password: string) => boolean;
  signup: (phone: string, fullName: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ phone: string; fullName: string } | null>(
    null
  );

  // Mock users for testing
  const mockUsers = [
    {
      phone: "0123456789",
      password: "123456",
      fullName: "Nguyễn Văn A",
    },
    {
      phone: "0987654321",
      password: "password",
      fullName: "Trần Thị B",
    },
  ];

  const login = (phone: string, password: string): boolean => {
    const user = mockUsers.find(
      (u) => u.phone === phone && u.password === password
    );

    if (user) {
      setIsLoggedIn(true);
      setUser({ phone: user.phone, fullName: user.fullName });
      return true;
    }
    return false;
  };

  const signup = (
    phone: string,
    fullName: string,
    password: string
  ): boolean => {
    // Check if phone already exists
    const exists = mockUsers.some((u) => u.phone === phone);
    if (exists) {
      return false;
    }

    // Add new user to mock data
    mockUsers.push({ phone, fullName, password });
    setIsLoggedIn(true);
    setUser({ phone, fullName });
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, signup, logout }}>
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
