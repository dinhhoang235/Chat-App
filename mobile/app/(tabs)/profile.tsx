import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <View className="mb-8">
          <Text className="text-3xl font-bold mb-4">Cá nhân</Text>
          {user && (
            <View className="items-center">
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                {user.fullName}
              </Text>
              <Text className="text-gray-600">{user.phone}</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        className="flex-row items-center justify-center bg-red-500 mx-6 py-3 rounded-lg mb-6"
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" color="white" size={20} />
        <Text className="text-white font-semibold ml-2">Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}
