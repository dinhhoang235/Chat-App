import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from '@/components';
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from '@/context/themeContext';

export default function LanguageSettings() {
  const { preference, setPreference, scheme, colors } = useTheme();
  const language = 'Tiếng Việt';

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Giao diện và ngôn ngữ" showBack={true} showSearch={false} />

      <View className="px-4 pt-4">
        <Text className={`${scheme === 'dark' ? 'text-white' : 'text-gray-700'} font-semibold mb-2` } >Giao diện</Text>

        <View className="flex-row space-x-3 mb-3">
          <TouchableOpacity
            className={`flex-1 rounded-lg overflow-hidden ${preference === 'light' ? 'border-2 border-blue-500' : (scheme === 'dark' ? 'border border-gray-800' : 'border border-gray-200')}`}
            onPress={() => setPreference('light')}
          >
            <View className="h-20 bg-white rounded shadow-sm overflow-hidden">
              <View className="p-3 h-full">
                <View className="w-3 h-3 rounded-full bg-blue-500 mb-2" />
                <View className="h-3 rounded bg-blue-100 w-3/4 mb-2"></View>
                <View className="h-2 rounded bg-gray-200 w-full mb-1"></View>
                <View className="h-2 rounded bg-gray-200 w-5/6"></View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 rounded-lg overflow-hidden ${preference === 'dark' ? 'border-2 border-blue-500' : (scheme === 'dark' ? 'border border-gray-800' : 'border border-gray-200')}`}
            onPress={() => setPreference('dark')}
          >
            <View className="h-20 bg-[#0f1724] rounded overflow-hidden">
              <View className="p-3 h-full">
                <View className="w-3 h-3 rounded-full bg-blue-500 mb-2" />
                <View className="h-3 rounded bg-gray-700 w-3/4 mb-2"></View>
                <View className="h-2 rounded bg-gray-700 w-full mb-1"></View>
                <View className="h-2 rounded bg-gray-700 w-5/6"></View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 rounded-lg overflow-hidden ${preference === 'system' ? 'border-2 border-blue-500' : (scheme === 'dark' ? 'border border-gray-800' : 'border border-gray-200')}`}
            onPress={() => setPreference('system')}
          >
            <View className="h-20 rounded overflow-hidden flex-row">
              <View className="w-1/2 bg-white p-3 justify-center">
                <View className="w-3 h-3 rounded-full bg-blue-500 mb-2" />
                <View className="h-3 rounded bg-blue-100 w-3/4 mb-2"></View>
                <View className="h-2 rounded bg-gray-200 w-full"></View>
              </View>
              <View className="w-1/2 bg-[#0f1724] p-3 justify-center">
                <View className="w-3 h-3 rounded-full bg-blue-500 mb-2" />
                <View className="h-3 rounded bg-gray-700 w-3/4 mb-2"></View>
                <View className="h-2 rounded bg-gray-700 w-full"></View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-between px-1 mb-4">
          <TouchableOpacity className="flex-1 items-center" onPress={() => setPreference('light')}>
            <View className={`${preference === 'light' ? 'w-6 h-6 rounded-full bg-blue-500 items-center justify-center' : 'w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 items-center justify-center'}`}>
              {preference === 'light' && <View className="w-3.5 h-3.5 rounded-full bg-white" />}
            </View>
            <Text className={`${scheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm mt-2`}>Sáng</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 items-center" onPress={() => setPreference('dark')}>
            <View className={`${preference === 'dark' ? 'w-6 h-6 rounded-full bg-blue-500 items-center justify-center' : 'w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 items-center justify-center'}`}>
              {preference === 'dark' && <View className="w-3.5 h-3.5 rounded-full bg-white" />}
            </View>
            <Text className={`${scheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm mt-2`}>Tối</Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 items-center" onPress={() => setPreference('system')}>
            <View className={`${preference === 'system' ? 'w-6 h-6 rounded-full bg-blue-500 items-center justify-center' : 'w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 items-center justify-center'}`}>
              {preference === 'system' && <View className="w-3.5 h-3.5 rounded-full bg-white" />}
            </View>
            <Text className={`${scheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm mt-2`}>Hệ thống</Text>
          </TouchableOpacity>
        </View>

        <Text className={`${scheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} font-semibold mb-2`}>Ngôn ngữ</Text>

        <TouchableOpacity
          className={`flex-row items-center justify-between px-4 py-3 rounded-lg`}
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          onPress={() => Alert.alert('Thay đổi ngôn ngữ', 'Chức năng chưa được triển khai')}
        >
          <View className="flex-row items-center">
            <View className={`w-8 h-8 rounded-full items-center justify-center mr-3`} style={{ backgroundColor: colors.surfaceVariant }}>
              <Text>🇻🇳</Text>
            </View>
            <View>
              <Text style={{ color: colors.text }}>Thay đổi ngôn ngữ</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{language}</Text>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
