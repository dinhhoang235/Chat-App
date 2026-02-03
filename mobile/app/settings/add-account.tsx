import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/authContext";

export default function AddAccount() {
  const { scheme, colors } = useTheme();
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Thêm tài khoản" showBack={true} showSearch={false} />

      <View className="px-6 py-8">
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Thêm tài khoản</Text>
          <Text style={{ color: colors.textSecondary }}>Bạn có thể đăng nhập bằng số điện thoại hoặc username</Text>
        </View>

        <View className="mt-6">
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Số điện thoại</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.input, color: colors.text, marginBottom: 12 }}
            placeholder="Nhập số điện thoại"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Mật khẩu</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.input, color: colors.text, marginBottom: 12 }}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.tint }}>Lấy lại mật khẩu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: phone && password ? colors.tint : colors.surfaceVariant, opacity: phone && password ? 1 : 0.8, borderRadius: 999, paddingVertical: 12, marginBottom: 16 }}
            disabled={!phone || !password}
            onPress={handleAdd}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>Thêm tài khoản</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
