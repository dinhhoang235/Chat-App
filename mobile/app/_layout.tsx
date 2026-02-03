import { Stack } from "expo-router";
import "../global.css";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/authContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../context/themeContext";
import { SelectionProvider } from "../context/selectionContext";

function ThemeRoot() {
  const { scheme, colors } = useTheme();
  return (
    <View className={`flex-1 ${scheme === 'dark' ? 'dark' : ''}`}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.header} />
      <SafeAreaProvider>
        <SelectionProvider>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" />
              <Stack.Screen name="signup" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthProvider>
        </SelectionProvider>
      </SafeAreaProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemeRoot />
    </ThemeProvider>
  );
} 
