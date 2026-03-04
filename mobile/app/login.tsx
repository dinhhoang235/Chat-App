import { useState } from "react";
import Animated, { useSharedValue } from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import { useTheme } from "../context/themeContext";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        'worklet';
        keyboardHeight.value = Math.max(event.height, 0);
      },
    },
    []
  );

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại và mật khẩu");
      return;
    }

    if (phone.length !== 10) {
      Alert.alert("Lỗi", "Số điện thoại phải có đúng 10 chữ số");
      return;
    }

    setLoading(true);
    try {
      const success = await login(phone, password);
      if (success) {
        router.replace("/(tabs)");
      } else {
        Alert.alert("Lỗi", "Số điện thoại hoặc mật khẩu không đúng");
      }
    } catch  {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi đăng nhập");
    } finally {
      setLoading(false);
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

        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Số điện thoại</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.input, color: colors.text }}
            placeholder="Nhập số điện thoại"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
            maxLength={10}
            editable={!loading}
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 8 }}>Mật khẩu</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, paddingRight: 48, backgroundColor: colors.input, color: colors.text }}
              placeholder="Nhập mật khẩu"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="ascii-capable"
              value={password}
              onChangeText={setPassword}
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

        <TouchableOpacity
          style={{ backgroundColor: colors.tint, borderRadius: 8, paddingVertical: 12, marginBottom: 16, opacity: loading ? 0.6 : 1 }}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 18 }}>
              Đăng nhập
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center">
          <Text style={{ color: colors.textSecondary }}>Chưa có tài khoản? </Text>
          <Link href="/signup" asChild>
            <TouchableOpacity disabled={loading}>
              <Text style={{ color: colors.tint, fontWeight: '600' }}>Đăng ký</Text>
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
