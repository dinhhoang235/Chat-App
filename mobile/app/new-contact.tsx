import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '@/components';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { userAPI } from '@/services/user';

export default function NewContact() {
  const { colors } = useTheme();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearchContact = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Vui lòng nhập số điện thoại');
      return;
    }
    
    // Normalize phone number: remove leading 0 if present, allow both formats
    const normalizedPhone = phoneNumber.startsWith('0') 
      ? phoneNumber.substring(1) 
      : phoneNumber;
    
    if (!normalizedPhone.trim()) {
      Alert.alert('Vui lòng nhập số điện thoại');
      return;
    }

    try {
      setLoading(true);
      
      // Get all users and find by phone number
      const users = await userAPI.getAllUsers();
      
      // Search for user with matching phone (handle both formats)
      const user = users.find((u: any) => {
        const userPhone = u.phone.startsWith('0') 
          ? u.phone.substring(1) 
          : u.phone;
        return userPhone === normalizedPhone || u.phone === phoneNumber;
      });
      
      if (!user) {
        Alert.alert(
          'Không tìm thấy tài khoản',
          'Số điện thoại này chưa được đăng ký hoặc không có trong danh bạ.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      router.push(`/profile/${user.id}`);
    } catch (error) {
      Alert.alert(
        'Lỗi',
        'Không thể tìm kiếm. Vui lòng thử lại sau.',
        [{ text: 'OK' }]
      );
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Thêm bạn" showBack />

      <View style={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 18 }}>
          <View style={{ width: 180, height: 180, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            {/* Placeholder QR - replace with real Image when available */}
            <View style={{ width: 120, height: 120, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#000', fontWeight: '700' }}>QR</Text>
            </View>
          </View>

          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 12 }}>Đình Hoàng</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 12 }}>Quét mã để thêm bạn Zalo với tôi</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity style={{ backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text }}>+84</Text>
            <MaterialIcons name="arrow-drop-down" size={20} color={colors.text} />
          </TouchableOpacity>

          <TextInput
            placeholder="Nhập số điện thoại"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={{ flex: 1, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, color: colors.text }}
          />

          <TouchableOpacity 
            onPress={handleSearchContact}
            disabled={!phoneNumber.trim() || loading}
            style={{ marginLeft: 8, padding: 12, backgroundColor: (phoneNumber.trim() && !loading) ? '#2563EB' : '#9CA3AF', borderRadius: 8 }}
          >
            {loading ? (
              <ActivityIndicator size={20} color="#fff" />
            ) : (
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
          <MaterialIcons name="qr-code-scanner" size={22} color={colors.icon} />
          <Text style={{ color: colors.text, marginLeft: 12, fontWeight: '700' }}>Quét mã QR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
          <MaterialIcons name="people" size={22} color={colors.icon} />
          <Text style={{ color: colors.text, marginLeft: 12, fontWeight: '700' }}>Bạn bè có thể quen</Text>
        </TouchableOpacity>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Xem lời mời kết bạn đã gửi tại trang Danh bạ Zalo</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
