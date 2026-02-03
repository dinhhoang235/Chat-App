import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from "../components/Header";
import { useTheme } from "../context/themeContext";
import { MaterialIcons } from '@expo/vector-icons';

export default function NewContact() {
  const { colors } = useTheme();

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
            style={{ flex: 1, backgroundColor: colors.surface, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, color: colors.text }}
          />

          <TouchableOpacity style={{ marginLeft: 8, padding: 12, backgroundColor: '#2563EB', borderRadius: 8 }}>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
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
