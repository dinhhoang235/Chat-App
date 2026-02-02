import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "./context/authContext";

export default function SignupScreen() {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const { signup } = useAuth();

  const handleSignup = () => {
    if (!phone || !fullName || !password || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu không trùng khớp");
      return;
    }

    if (signup(phone, fullName, password)) {
      Alert.alert("Thành công", "Đăng ký tài khoản thành công");
      router.replace("/(tabs)");
    } else {
      Alert.alert("Lỗi", "Số điện thoại này đã được đăng ký");
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 px-6 py-8 justify-center">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Đăng ký</Text>
          <Text className="text-gray-600">Tạo tài khoản mới</Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-semibold mb-2">Số điện thoại</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-semibold mb-2">Họ và tên</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Nhập họ và tên"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-semibold mb-2">Mật khẩu</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Nhập mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 font-semibold mb-2">Xác nhận mật khẩu</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 bg-white"
            placeholder="Xác nhận mật khẩu"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity
          className="bg-blue-500 rounded-lg py-3 mb-4"
          onPress={handleSignup}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Đăng ký
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text className="text-gray-600">Đã có tài khoản? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text className="text-blue-500 font-semibold">Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
