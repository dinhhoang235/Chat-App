import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Message } from '../constants/mockData';

type Props = {
  message: Message;
  onPress?: () => void;
};

export function MessageRow({ message, onPress }: Props) {
  const initials = message.initials ?? message.name.split(' ').map(n => n[0]).slice(0, 2).join('');

  return (
    <TouchableOpacity onPress={onPress} className="px-4 py-3 flex-row items-center">
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: message.color || '#6B7280' }}
      >
        <Text className="text-white font-bold">{initials}</Text>
      </View>

      <View className="ml-4 flex-1">
        <Text className="text-base text-gray-900 dark:text-white">{message.name}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message.lastMessage}</Text>
      </View>

      <View className="items-end">
        <Text className="text-xs text-gray-400 dark:text-gray-400">{message.time}</Text>
        {message.unread && message.unread > 0 ? (
          <View className="bg-red-500 rounded-full px-2 py-0.5 mt-2">
            <Text className="text-white text-xs font-bold">{message.unread}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
