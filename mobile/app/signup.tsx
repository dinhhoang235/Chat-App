import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../context/authContext";
import { useTheme } from "../context/themeContext";

export default function SignupScreen() {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const { signup } = useAuth();
  const { colors } = useTheme();

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
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-6 py-8 justify-center">
          <View style={{ marginBottom: 32 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 }}>Đăng ký</Text>
            <Text style={{ color: colors.textSecondary }}>Tạo tài khoản mới</Text>
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

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Họ và tên</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.input, color: colors.text }}
            placeholder="Nhập họ và tên"
            placeholderTextColor={colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Mật khẩu</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.surface, color: colors.text }}
            placeholder="Nhập mật khẩu"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Xác nhận mật khẩu</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.surface, color: colors.text }}
            placeholder="Xác nhận mật khẩu"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <TouchableOpacity
          style={{ backgroundColor: colors.tint, borderRadius: 8, paddingVertical: 12, marginBottom: 16 }}
          onPress={handleSignup}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 18 }}>
            Đăng ký
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Đã có tài khoản? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={{ color: colors.tint, fontWeight: '600' }}>Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
