import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeScheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  scheme: ThemeScheme; // resolved scheme
  colors: typeof Colors.dark | typeof Colors.light;
}


const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme.preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [rehydrated, setRehydrated] = useState(false);

  // load saved preference once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setPreferenceState(raw as ThemePreference);
        }
      } catch {
        // no-op if AsyncStorage not available
      } finally {
        if (mounted) setRehydrated(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    // persist
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, p);
      } catch {
        // ignore
      }
    })();
  }, []);

  const scheme = useMemo<ThemeScheme>(() => {
    const activePref = preference ?? 'system';
    if (activePref === 'system') return system === 'dark' ? 'dark' : 'light';
    return activePref === 'dark' ? 'dark' : 'light';
  }, [preference, system]);

  const colors = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ preference, setPreference, scheme, colors }}>
      {rehydrated ? children : null}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
