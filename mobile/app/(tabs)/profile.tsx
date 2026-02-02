import { View, Text } from "react-native";
import { useAuth } from "../../context/authContext";
import { Header } from "../../components/Header";

export default function Profile() {
  const { user } = useAuth();

  const handleSearch = (text: string) => {
    console.log("Search:", text);
  };

  return (
    <View className="flex-1 bg-white">
      <Header 
        title="Cá nhân" 
        subtitle="Thông tin tài khoản"
        showSearch={true}
        onSearch={handleSearch}
        addHref="/settings"
        addIconName="settings"
      />
      <View className="flex-1 items-center justify-center">
        {user && (
          <View className="items-center">
            <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-4">
              <Text className="text-3xl font-bold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-lg font-semibold text-gray-800 mb-2">
              {user.fullName}
            </Text>
            <Text className="text-gray-600">{user.phone}</Text>
          </View>
        )}
      </View>

    </View>
  );
}
