import React, { useState } from "react";
import { View, Text, TouchableOpacity, Switch, ScrollView, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/authContext";
import { useRouter } from 'expo-router';
import MyQrModal from '../../components/MyQrModal';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AccountSettings() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [twoFactor, setTwoFactor] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  return (
    <SafeAreaView className={`${theme.scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Tài khoản và bảo mật" showBack={true} showSearch={false} />

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className={`${theme.scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Tài khoản</Text>
        {/* Account card */}
        <TouchableOpacity onPress={() => router.push('/profile/me/info')} className={`${theme.scheme === 'dark' ? 'bg-background-dark' : 'bg-white'} rounded-lg px-4 py-3 flex-row items-center justify-between border ${theme.scheme === 'dark' ? 'border-gray-800' : 'border-gray-200'} mb-4`}>
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 items-center justify-center mr-4 overflow-hidden">
              {user?.avatar ? (
                <Image
                  source={{ uri: `${API_BASE_URL}${user.avatar}` }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'} font-bold text-lg`}>{user ? user.fullName.charAt(0).toUpperCase() : 'U'}</Text>
              )}
            </View>
            <View>
              <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'} font-semibold`}>{user ? user.fullName : 'Tên người dùng'}</Text>
              <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Thông tin cá nhân</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.scheme === 'dark' ? '#9CA3AF' : '#9CA3AF'} />
        </TouchableOpacity>

        {/* Contact rows */}
        <TouchableOpacity className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="call" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Số điện thoại</Text>
            <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>{user ? user.phone : 'Chưa có'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="mail-outline" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Email</Text>
            <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>dinhtest@example.com</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setQrVisible(true)} className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="qr-code" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mã QR của tôi</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Divider */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />

        {/* Security section */}
        <Text className={`${theme.scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Bảo mật</Text>

        <TouchableOpacity className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`} onPress={() => alert('Kiểm tra bảo mật') }>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="shield" size={20} color={theme.scheme === 'dark' ? '#F59E0B' : '#F59E0B'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Kiểm tra bảo mật</Text>
            <Text className={`${theme.scheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} text-sm`}>1 vấn đề bảo mật cần xử lý</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>


        {/* Divider */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />

        <Text className={`${theme.scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Đăng nhập</Text>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="security" size={20} color={theme.scheme === 'dark' ? '#4F46E5' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Bảo mật 2 lớp</Text>
            <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Thêm hình thức xác nhận để bảo vệ tài khoản</Text>
          </View>
          <Switch value={twoFactor} onValueChange={setTwoFactor} thumbColor={twoFactor ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View>

        <TouchableOpacity className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="devices" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Thiết bị đăng nhập</Text>
            <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Quản lý các thiết bị bạn sử dụng để đăng nhập</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="vpn-key" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Mật khẩu</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Delete account */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
        <TouchableOpacity
          className={`px-4 py-4 rounded-lg flex-row items-center justify-between ${theme.scheme === 'dark' ? 'border-t border-gray-800' : 'border-t border-gray-100'}`}
          onPress={() =>
            Alert.alert(
              'Xóa tài khoản',
              'Bạn có chắc muốn xóa tài khoản? Thao tác này không thể hoàn tác.',
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Xóa',
                  style: 'destructive',
                  onPress: () => {
                    // TODO: implement delete account
                    Alert.alert('Đã xóa', 'Tài khoản đã được xóa (mock).');
                  },
                },
              ]
            )
          }
        >
          <Text className="text-red-500 font-medium">Xóa tài khoản</Text>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <MyQrModal visible={qrVisible} onClose={() => setQrVisible(false)} name={user?.fullName} phone={user?.phone} data={`chatapp:user:${user?.phone ?? 'me'}`} />

      </ScrollView>
    </SafeAreaView>
  );
}

