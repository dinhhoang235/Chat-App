import React, { useState } from "react";
import { View, Text, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from '@/components';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from "@expo/vector-icons";

export default function NotificationsSettings() {
  const theme = useTheme();
  const [newDirectMsg, setNewDirectMsg] = useState(true);
  const [previewDirect, setPreviewDirect] = useState(true);
  const [newGroupMsg, setNewGroupMsg] = useState(true);
  const [incomingCalls, setIncomingCalls] = useState(true);
  const [silentCallsFromFriends, setSilentCallsFromFriends] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [vibrateOn, setVibrateOn] = useState(true);
  const [previewOn, setPreviewOn] = useState(true);

  return (
    <SafeAreaView className={`${theme.scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Thông báo" showBack={true} showSearch={false} />

      <ScrollView className="px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className={`${theme.scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Trò chuyện 2 người</Text>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="chat" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Báo tin nhắn mới từ trò chuyện 2 người</Text>
          </View>
          <Switch value={newDirectMsg} onValueChange={setNewDirectMsg} thumbColor={newDirectMsg ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="visibility" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Xem trước tin nhắn</Text>
          </View>
          <Switch value={previewDirect} onValueChange={setPreviewDirect} thumbColor={previewDirect ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View>

        {/* Group chats */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
        <Text className={`${theme.scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Trò chuyện nhóm</Text>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="group" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Báo tin nhắn mới từ nhóm</Text>
          </View>
          <Switch value={newGroupMsg} onValueChange={setNewGroupMsg} thumbColor={newGroupMsg ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View> 

        {/* Calls */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
        <Text className={`${theme.scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Cuộc gọi</Text>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="call" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Báo cuộc gọi đến</Text>
          </View>
          <Switch value={incomingCalls} onValueChange={setIncomingCalls} thumbColor={incomingCalls ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="volume-off" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tắt thông báo cuộc gọi từ bạn bè</Text>
            <Text className={`${theme.scheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>0 người</Text>
          </View>
          <Switch value={silentCallsFromFriends} onValueChange={setSilentCallsFromFriends} thumbColor={silentCallsFromFriends ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View> 

        {/* App notifications */}
        <View className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
        <Text className={`${theme.scheme === 'dark' ? 'text-blue-400' : 'text-blue-600'} font-semibold mb-2`}>Thông báo trong Zalo</Text>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="notifications-active" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Phát âm báo tin nhắn mới trong Zalo</Text>
          </View>
          <Switch value={soundOn} onValueChange={setSoundOn} thumbColor={soundOn ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="vibration" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Rung khi có tin nhắn mới trong Zalo</Text>
          </View>
          <Switch value={vibrateOn} onValueChange={setVibrateOn} thumbColor={vibrateOn ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View>

        <View className={`${theme.scheme === 'dark' ? 'flex-row items-center px-4 py-3 border-t border-gray-800' : 'flex-row items-center px-4 py-3 border-t border-gray-100'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${theme.scheme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <MaterialIcons name="remove-red-eye" size={20} color={theme.scheme === 'dark' ? '#9CA3AF' : '#4F46E5'} />
          </View>
          <View className="flex-1">
            <Text className={`${theme.scheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Xem trước tin nhắn mới trong Zalo</Text>
          </View>
          <Switch value={previewOn} onValueChange={setPreviewOn} thumbColor={previewOn ? '#fff' : '#fff'} trackColor={{ false: '#9CA3AF', true: '#10B981' }} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
