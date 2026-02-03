import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/themeContext";
import { useAuth } from "../../context/authContext";
import { useRouter } from "expo-router";

export default function SwitchAccount() {
  const { scheme, colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Chuyển tài khoản" showBack={true} showSearch={false} />

      <View className="px-4 pt-4">
        <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Thêm tài khoản để đăng nhập nhanh.</Text>

        <View className="space-y-3">
          {user && (
            <TouchableOpacity
              activeOpacity={0.8}
              className="px-4 py-3 rounded-lg flex-row items-center justify-between"
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
              onPress={() => { /* future: switch account */ }}
            >
              <View className="flex-row items-center">
                <View style={{ position: 'relative' }} className="mr-4">
                  <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surface }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{user.fullName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ position: 'absolute', right: -6, top: -6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success, borderWidth: 2, borderColor: '#fff' }}>
                    <MaterialIcons name="check" size={14} color="#fff" />
                  </View>
                </View>

                <View>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{user.fullName}</Text>
                </View>
              </View>

              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Đã đăng nhập</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="flex-row items-center px-4 py-4 rounded-lg"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            onPress={() => router.push('/settings/add-account')}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16, backgroundColor: colors.surface }}>
              <MaterialIcons name="add" size={28} color={colors.tint} />
            </View>
            <View>
              <Text style={{ color: colors.tint, fontWeight: '600' }}>Thêm tài khoản</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
