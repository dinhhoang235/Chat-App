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

  const { scheme, colors } = useTheme();

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
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
            <View className="w-14 h-14 bg-blue-500 rounded-full items-center justify-center mr-4">
              <Text className="text-xl font-bold text-white">{user.fullName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold`}>{user.fullName}</Text>
              <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>{user.phone}</Text>
            </View>
          </View>
        )}
        <View className={`${scheme === 'dark' ? 'mt-2 rounded-lg overflow-hidden bg-background-dark border border-gray-800' : 'mt-2 rounded-lg overflow-hidden bg-background border border-gray-100'}`}>
          {items.map((it) => (
            <Link key={it.title} href={it.href as any} asChild>
              <TouchableOpacity className={`${scheme === 'dark' ? 'flex-row items-center py-3 border-t border-gray-800 bg-background-dark' : 'flex-row items-center py-3 border-t border-gray-100 bg-background'}`}>
                <View className={`${scheme === 'dark' ? 'w-10 h-10 rounded-full bg-gray-800 items-center justify-center mr-3' : 'w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3'}`}>
                  <MaterialIcons name={it.icon as any} size={20} color={colors.tint} />
                </View>
                <View className="flex-1">
                  <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>{it.title}</Text>
                  <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>{it.subtitle}</Text>
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
