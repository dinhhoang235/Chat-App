import React, { useState } from "react";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import { useTheme } from "../context/themeContext";

export default function SignupScreen() {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useSharedValue(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useKeyboardHandler(
    {
      onMove: (event) => {
        'worklet';
        keyboardHeight.value = Math.max(event.height, 0);
      },
    },
    []
  );

  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSignup = async () => {
    if (!phone || !fullName || !password || !confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu không trùng khớp");
      return;
    }

    setLoading(true);
    try {
      const success = await signup(phone, fullName, password);
      if (success) {
        Alert.alert("Thành công", "Đăng ký tài khoản thành công");
        router.replace("/(tabs)");
      } else {
        Alert.alert("Lỗi", "Số điện thoại này đã được đăng ký");
      }
    } catch {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi đăng ký");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ flexGrow: 1 }}>
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
            editable={!loading}
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
            editable={!loading}
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Mật khẩu</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, paddingRight: 48, backgroundColor: colors.surface, color: colors.text }}
              placeholder="Nhập mật khẩu"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={handleInputFocus}
              editable={!loading}
            />
            <TouchableOpacity
              style={{ position: 'absolute', right: 12, top: 12 }}
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={18}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Xác nhận mật khẩu</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, paddingRight: 48, backgroundColor: colors.surface, color: colors.text }}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={handleInputFocus}
              editable={!loading}
            />
            <TouchableOpacity
              style={{ position: 'absolute', right: 12, top: 12 }}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <MaterialIcons
                name={showConfirmPassword ? "visibility" : "visibility-off"}
                size={18}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={{ backgroundColor: colors.tint, borderRadius: 8, paddingVertical: 12, marginBottom: 16, opacity: loading ? 0.6 : 1 }}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 18 }}>
              Đăng ký
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Đã có tài khoản? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity disabled={loading}>
              <Text style={{ color: colors.tint, fontWeight: '600' }}>Đăng nhập</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
      </ScrollView>
      <Animated.View
        style={[
          { 
            backgroundColor: colors.background,
            height: keyboardHeight,
            paddingBottom: insets.bottom,
          },
        ]}
      />
    </SafeAreaView>
  );
}
