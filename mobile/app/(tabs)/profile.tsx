import { View, Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/authContext";
import { Header } from "../../components/Header";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/themeContext";

const items = [
  { title: 'Tài khoản và bảo mật', subtitle: 'Cài đặt mật khẩu, 2 bước xác thực', icon: 'security', href: '/settings/account' },
  { title: 'Quyền riêng tư', subtitle: 'Quản lý quyền truy cập và xem', icon: 'shield', href: '/settings/privacy' },
];

export default function Profile() {
  const { user } = useAuth();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  const { colors } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header 
        title="Cá nhân" 
        subtitle="Thông tin tài khoản"
        showSearch={true}
        onSearch={handleSearch}
        addHref="/settings"
        addIconName="settings"
      />

      <View className="px-4">
        {user && (
          <View className="flex-row items-center py-4">
            <View style={{ width: 56, height: 56, backgroundColor: colors.tint, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{user.fullName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{user.fullName}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{user.phone}</Text> 
            </View>
          </View>
        )}
        <View style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          {items.map((it) => (
            <Link key={it.title} href={it.href as any} asChild>
              <TouchableOpacity className="flex-row items-center py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
                <View style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surface }}>
                  <MaterialIcons name={it.icon as any} size={20} color={colors.tint} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{it.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{it.subtitle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </View>

    </SafeAreaView>
  );
}
