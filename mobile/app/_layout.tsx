import React, { useEffect, useRef } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import "../global.css";
import { Animated, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { AntDesign, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { NotificationHandler } from '@/components/';
import { IncomingCallModal, ActiveCallBar } from '@/components/call';
import { BAR_CONTENT_HEIGHT } from '@/components/call/ActiveCallBar';
import { AuthProvider, useAuth } from "@/context/authContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/context/themeContext";
import { SelectionProvider } from "@/context/selectionContext";
import { SearchProvider } from "@/context/searchContext";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { CallProvider, useCall } from "@/context/callContext";

const CALL_SCREENS = ['/call', '/videoCall', '/groupCall'];

/**
 * Pushes AppStack down by BAR_CONTENT_HEIGHT when the call bar is visible.
 * The bar is absolute-positioned so it overlays the status-bar area.
 * Screens keep their own insets.top handling → no double-counting.
 */
function AppStackWrapper() {
  const { activeCall, callStatus } = useCall();
  const pathname = usePathname();
  const marginAnim = useRef(new Animated.Value(0)).current;

  const isOnCallScreen = CALL_SCREENS.some((s) => pathname.startsWith(s));
  const hasActiveCall =
    !!activeCall && ['calling', 'connecting', 'active', 'incoming'].includes(callStatus);
  const barVisible = hasActiveCall && !isOnCallScreen;

  useEffect(() => {
    Animated.timing(marginAnim, {
      toValue: barVisible ? BAR_CONTENT_HEIGHT : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [barVisible, marginAnim]);

  return (
    <Animated.View style={{ flex: 1, marginTop: marginAnim }}>
      <AppStack />
    </Animated.View>
  );
}

function ThemeRoot() {
  const { scheme, colors } = useTheme();
  const rootClass = scheme === "dark" ? "flex-1 dark" : "flex-1";
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...Ionicons.font,
    ...Feather.font,
    ...AntDesign.font,
  });

  if (!fontsLoaded) {
    return <View className={rootClass} style={{ backgroundColor: colors.background }} />;
  }

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
                <CallProvider>
                  <SearchProvider>
                    <NotificationHandler />
                    <IncomingCallModal />
                    {/* Absolute bar overlays status-bar area */}
                    <ActiveCallBar />
                    {/* Wrapper animates marginTop = BAR_CONTENT_HEIGHT only */}
                    <AppStackWrapper />
                  </SearchProvider>
                </CallProvider>
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
    <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemeRoot />
    </ThemeProvider>
  );
}