import React, { useState } from "react";
import { View, Text, TouchableOpacity, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { MaterialIcons } from "@expo/vector-icons";

export default function PrivacySettings() {
  const { scheme, colors } = useTheme();
  const [showSeen, setShowSeen] = useState(true);
  const [allowCalls, setAllowCalls] = useState(false);

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Quyền riêng tư" showBack={true} showSearch={false} />

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className={`${scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Cá nhân</Text>

        <TouchableOpacity className={`${scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="visibility" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Hiện trạng thái truy cập</Text>
          </View>
          <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Đang bật</Text>
        </TouchableOpacity>

        {/* Messages & Calls */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
        <Text className={`${scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Tin nhắn và cuộc gọi</Text>

        <View className={`${scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="remove-red-eye" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Hiện trạng thái &quot;Đã xem&quot;</Text>
          </View>
          <Switch value={showSeen} onValueChange={setShowSeen} thumbColor={showSeen ? '#fff' : '#fff'} trackColor={{ false: colors.textSecondary, true: colors.success }} />
        </View>

        <TouchableOpacity className={`${scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="chat" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Cho phép nhắn tin</Text>
            <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Mọi người</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View className={`${scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="call" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Cho phép gọi điện</Text>
            <Text className={`${scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Bạn bè</Text>
          </View>
          <Switch value={allowCalls} onValueChange={setAllowCalls} thumbColor={allowCalls ? '#fff' : '#fff'} trackColor={{ false: colors.textSecondary, true: colors.success }} />
        </View>

        {/* Search & Friends */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
        <Text className={`${scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Nguồn tìm kiếm và kết bạn</Text>

        <TouchableOpacity className={`${scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="search" size={20} color={colors.tint} />
          </View>
          <View className="flex-1">
            <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Quản lý nguồn tìm kiếm và kết bạn</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
