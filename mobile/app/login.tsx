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
  const { colors } = useTheme();

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
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 py-8 justify-center">
        <View style={{ marginBottom: 32 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 }}>Đăng nhập</Text>
          <Text style={{ color: colors.textSecondary }}>Chào mừng bạn quay lại</Text>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
            Test: 0123456789 / 123456
          </Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Số điện thoại</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.input, color: colors.text }}
            placeholder="Nhập số điện thoại"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Mật khẩu</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.input, color: colors.text }}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={{ backgroundColor: colors.tint, borderRadius: 8, paddingVertical: 12, marginBottom: 16 }}
          onPress={handleLogin}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 18 }}>
            Đăng nhập
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text style={{ color: colors.textSecondary }}>Chưa có tài khoản? </Text>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.tint, fontWeight: '600' }}>Đăng ký</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
