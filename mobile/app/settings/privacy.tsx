import React, { useState } from "react";
import { View, Text, TouchableOpacity, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { MaterialIcons } from "@expo/vector-icons";

export default function PrivacySettings() {
  const { colors } = useTheme();
  const [showSeen, setShowSeen] = useState(true);
  const [allowCalls, setAllowCalls] = useState(false);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Quyền riêng tư" showBack={true} showSearch={false} />

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={{ color: colors.tint, fontWeight: '600', marginBottom: 8 }}>Cá nhân</Text>

        <TouchableOpacity className="flex-row items-center px-4 py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surface }}>
            <MaterialIcons name="visibility" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }}>Hiện trạng thái truy cập</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Đang bật</Text>
        </TouchableOpacity>

        {/* Messages & Calls */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
        <Text style={{ color: colors.tint, fontWeight: '600', marginBottom: 8 }}>Tin nhắn và cuộc gọi</Text>

        <View className="flex-row items-center px-4 py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surface }}>
            <MaterialIcons name="remove-red-eye" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }}>Hiện trạng thái &quot;Đã xem&quot;</Text>
          </View>
          <Switch value={showSeen} onValueChange={setShowSeen} thumbColor={showSeen ? '#fff' : '#fff'} trackColor={{ false: colors.textSecondary, true: colors.success }} />
        </View>

        <TouchableOpacity className="flex-row items-center px-4 py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surface }}>
            <MaterialIcons name="chat" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }}>Cho phép nhắn tin</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Mọi người</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View className="flex-row items-center px-4 py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surface }}>
            <MaterialIcons name="call" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }}>Cho phép gọi điện</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Bạn bè</Text>
          </View>
          <Switch value={allowCalls} onValueChange={setAllowCalls} thumbColor={allowCalls ? '#fff' : '#fff'} trackColor={{ false: colors.textSecondary, true: colors.success }} />
        </View>

        {/* Search & Friends */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
        <Text style={{ color: colors.tint, fontWeight: '600', marginBottom: 8 }}>Nguồn tìm kiếm và kết bạn</Text>

        <TouchableOpacity className="flex-row items-center px-4 py-3" style={{ borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surface }}>
            <MaterialIcons name="search" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }}>Quản lý nguồn tìm kiếm và kết bạn</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
