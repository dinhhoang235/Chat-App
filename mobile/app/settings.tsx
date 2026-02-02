import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../components/Header";
import { useAuth } from "../context/authContext";
import { MaterialIcons } from "@expo/vector-icons";

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

  return (
    <View className="flex-1 bg-white">
      <Header title="Cài đặt" showSearch={false} showBack={true} />
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Trang Cài đặt (mock)</Text>
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
