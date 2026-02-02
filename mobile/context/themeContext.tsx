import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  scheme: ThemeScheme; // resolved scheme
  colors: typeof Colors.dark | typeof Colors.light;
}


const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useSystemColorScheme() ?? 'light';
  const [preference, setPreference] = useState<ThemePreference>('system');

  const scheme = useMemo<ThemeScheme>(() => {
    if (preference === 'system') return system === 'dark' ? 'dark' : 'light';
    return preference === 'dark' ? 'dark' : 'light';
  }, [preference, system]);

  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  // (Optional) Persist preference here in the future

  return (
    <ThemeContext.Provider value={{ preference, setPreference, scheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
