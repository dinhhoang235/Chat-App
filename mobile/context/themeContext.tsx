import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  scheme: ThemeScheme; // resolved scheme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useSystemColorScheme() ?? 'light';
  const [preference, setPreference] = useState<ThemePreference>('system');

  const scheme = useMemo<ThemeScheme>(() => {
    if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
    return preference === 'dark' ? 'dark' : 'light';
  }, [preference, system]);

  // (Optional) Persist preference here in the future

  return (
    <ThemeContext.Provider value={{ preference, setPreference, scheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
