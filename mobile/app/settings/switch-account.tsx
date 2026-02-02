import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/themeContext";
import { useAuth } from "../../context/authContext";
import { useRouter } from "expo-router";

export default function SwitchAccount() {
  const { scheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Chuyển tài khoản" showBack={true} showSearch={false} />

      <View className="px-4 pt-4">
        <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Thêm tài khoản để đăng nhập nhanh.</Text>

        <View className="space-y-3">
          {user && (
            <TouchableOpacity
              activeOpacity={0.8}
              className={`${scheme === 'dark' ? 'bg-background-dark' : 'bg-background'} px-4 py-3 rounded-lg flex-row items-center justify-between border ${scheme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}
              onPress={() => { /* future: switch account */ }}
            >
              <View className="flex-row items-center">
                <View style={{ position: 'relative' }} className="mr-4">
                  <View className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 items-center justify-center overflow-hidden">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg">{user.fullName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ position: 'absolute', right: -6, top: -6 }} className="w-6 h-6 rounded-full bg-green-500 items-center justify-center border-2 border-white">
                    <MaterialIcons name="check" size={14} color="#fff" />
                  </View>
                </View>

                <View>
                  <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'} font-medium`}>{user.fullName}</Text>
                </View>
              </View>

              <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Đã đăng nhập</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className={`${scheme === 'dark' ? 'bg-background-dark' : 'bg-background'} flex-row items-center px-4 py-4 rounded-lg border ${scheme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}
            onPress={() => router.push('/settings/add-account')}
          >
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <MaterialIcons name="add" size={28} color={scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
            </View>
            <View>
              <Text className={`${scheme === 'dark' ? 'text-white' : 'text-blue-500'} font-medium`}>Thêm tài khoản</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
