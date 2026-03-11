import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import "../global.css";
import { View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from '@/context/authContext';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from '@/context/themeContext';
import { SelectionProvider } from '@/context/selectionContext';
import { SearchProvider } from '@/context/searchContext';
import { KeyboardProvider } from 'react-native-keyboard-controller';

function ThemeRoot() {
  const { scheme, colors } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={`flex-1 ${scheme === 'dark' ? 'dark' : ''}`}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.header} />
        <SafeAreaProvider>
          <KeyboardProvider>
            <SelectionProvider>
              <AuthProvider>
          <SearchProvider>
            <AppStack />
          </SearchProvider>
        </AuthProvider>
            </SelectionProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}

// simple navigation stack that switches depending on authentication state
function AppStack() {
  const { isLoggedIn, initialized } = useAuth();
  const router = useRouter();

  // if auth state changes we immediately update navigation
  useEffect(() => {
    if (!initialized) return; // wait for storage hydration

    if (isLoggedIn) {
      // send to main tabs when logged in
      router.replace('/(tabs)');
    } else {
      // make sure unauthenticated users land on login
      router.replace('/login');
    }
  }, [isLoggedIn, initialized, router]);

  if (!initialized) {
    // could render splash/loading indicator here
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemeRoot />
    </ThemeProvider>
  );
} 
