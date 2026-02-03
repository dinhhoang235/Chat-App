import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { useAuth } from "../context/authContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../context/themeContext";

type SettingsRoute =
  | "/settings/account"
  | "/settings/privacy"
  | "/settings/notifications"
  | "/settings/language"
  | "/settings/help"
  | "/settings/switch-account";

const settingsItems: { title: string; icon: string; route: SettingsRoute }[] = [
  { title: 'Tài khoản và bảo mật', icon: 'security', route: '/settings/account' },
  { title: 'Quyền riêng tư', icon: 'shield', route: '/settings/privacy' },
  { title: 'Thông báo', icon: 'notifications', route: '/settings/notifications' },
  { title: 'Giao diện và ngôn ngữ', icon: 'palette', route: '/settings/language' },
  { title: 'Trợ giúp', icon: 'help-outline', route: '/settings/help' },
  { title: 'Chuyển tài khoản', icon: 'swap-horiz', route: '/settings/switch-account' },
];

export default function Settings() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const { colors } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Cài đặt" showSearch={false} showBack={true} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingVertical: 8 }}>
        <View>
          {settingsItems.map((it) => (
            <TouchableOpacity
              key={it.title}
              className="flex-row items-center px-4 py-3"
              style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}
              onPress={() => (it.route ? router.push(it.route) : Alert.alert(it.title))}
            >
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: colors.surface }}>
                <MaterialIcons name={it.icon as any} size={20} color={colors.tint} />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text, fontWeight: '600' }}>{it.title}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: colors.background }}>
        <TouchableOpacity
          className="flex-row items-center justify-center mx-6 py-3 rounded-full mb-6"
          style={{ backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.border }}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" color={colors.text} size={20} />
          <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 8 }}>Đăng xuất</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}
