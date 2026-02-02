import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/authContext";

export default function AddAccount() {
  const { scheme } = useTheme();
  const router = useRouter();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleAdd = () => {
    if (!phone || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại và mật khẩu");
      return;
    }

    // Attempt login (mock). If success go back to switch-account
    if (login(phone, password)) {
      router.back();
    } else {
      Alert.alert("Lỗi", "Số điện thoại hoặc mật khẩu không đúng");
    }
  };

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Thêm tài khoản" showBack={true} showSearch={false} />

      <View className="px-6 py-8">
        <View className="mb-3">
          <Text className={`${scheme === 'dark' ? 'text-white' : 'text-2xl font-bold text-gray-900'} mb-2`}>Thêm tài khoản</Text>
          <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Bạn có thể đăng nhập bằng số điện thoại hoặc username</Text>
        </View>

        <View className="mt-6">
          <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">Số điện thoại</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-background dark:bg-background-dark mb-4"
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">Mật khẩu</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-background dark:bg-background-dark mb-2"
            placeholder="Nhập mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity className="mb-6">
            <Text className="text-blue-500">Lấy lại mật khẩu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`${phone && password ? 'bg-blue-500' : 'bg-gray-600 opacity-70'} rounded-full py-3 mb-4`}
            disabled={!phone || !password}
            onPress={handleAdd}
          >
            <Text className="text-white text-center font-semibold text-lg">Thêm tài khoản</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
