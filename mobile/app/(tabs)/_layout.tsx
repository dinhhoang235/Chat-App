import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/themeContext";
import { useSelection } from "../../context/selectionContext";

export default function TabsLayout() {
  const { scheme, colors } = useTheme();
  const isDark = scheme === 'dark';

  const { selectionMode } = useSelection();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0084FF",
        tabBarInactiveTintColor: isDark ? "#9CA3AF" : "#999",
        tabBarStyle: selectionMode ? { display: 'none' as any } : { backgroundColor: isDark ? colors.surface : '#ffffff', borderTopColor: isDark ? colors.surface : '#e5e7eb' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="message" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Danh bạ",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="contacts" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
