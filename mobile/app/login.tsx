import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../context/authContext";
import { useTheme } from "../context/themeContext";

export default function LoginScreen() {
  const [phone, setPhone] = useState("0123456789");
  const [password, setPassword] = useState("123456");
  const router = useRouter();
  const { login } = useAuth();
  const theme = useTheme();

  const handleLogin = () => {
    if (!phone || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại và mật khẩu");
      return;
    }

    if (login(phone, password)) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("Lỗi", "Số điện thoại hoặc mật khẩu không đúng");
    }
  };

  return (
    <SafeAreaView className={`${theme.scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 py-8 justify-center">
        <View className="mb-8">
          <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-3xl font-bold text-gray-900'} mb-2`}>Đăng nhập</Text>
          <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Chào mừng bạn quay lại</Text>
        </View>

        <View className="mb-2">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Test: 0123456789 / 123456
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">Số điện thoại</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-background dark:bg-background-dark"
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">Mật khẩu</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-background dark:bg-background-dark"
            placeholder="Nhập mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          className="bg-blue-500 rounded-lg py-3 mb-4"
          onPress={handleLogin}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Đăng nhập
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Chưa có tài khoản? </Text>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text className="text-blue-500 font-semibold">Đăng ký</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
