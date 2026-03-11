import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import "../global.css";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/context/authContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/context/themeContext";
import { SelectionProvider } from "@/context/selectionContext";
import { SearchProvider } from "@/context/searchContext";
import { KeyboardProvider } from "react-native-keyboard-controller";

function ThemeRoot() {
  const { scheme, colors } = useTheme();
  const rootClass = scheme === "dark" ? "flex-1 dark" : "flex-1";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={rootClass}>
        <StatusBar
          style={scheme === "dark" ? "light" : "dark"}
          backgroundColor={colors.header}
        />

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

function AppStack() {
  const { isLoggedIn, initialized } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const target = isLoggedIn ? "/(tabs)" : "/login";
    router.replace(target);
  }, [isLoggedIn, initialized, router]);

  if (!initialized) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemeRoot />
    </ThemeProvider>
  );
}