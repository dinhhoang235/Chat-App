import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../context/themeContext';

type ChatMessage = {
  id: string;
  text?: string;
  time?: string;
  fromMe?: boolean;
  type?: 'text' | 'sticker' | 'contact' | 'separator';
  contactName?: string;
  contactAvatarColor?: string;
  reactions?: { emoji: string; count?: number }[];
};

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const { scheme, colors } = useTheme();

  if (message.type === 'separator') {
    return (
      <View className="w-full items-center my-4">
        <View className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800">
          <Text className="text-xs text-gray-700 dark:text-gray-300">{message.text}</Text>
        </View>
      </View>
    );
  }

  const isOutgoing = !!message.fromMe;
  let bubbleBg = '#fff';
  let borderColor = 'transparent';
  let textColor = colors.text;
  const timeColor = scheme === 'dark' ? '#9CA3AF' : '#9CA3AF';

  if (isOutgoing) {
    if (scheme === 'dark') {
      bubbleBg = '#2563EB';
      borderColor = '#1E40AF';
      textColor = '#fff';
    } else {
      bubbleBg = '#2563EB'; 
      borderColor = '#1E40AF';
      textColor = '#fff';
    }
  } else {
    if (scheme === 'dark') {
      bubbleBg = colors.surface;
      borderColor = colors.surfaceVariant;
      textColor = colors.text;
    } else {
      bubbleBg = colors.surface;
      borderColor = colors.surfaceVariant;
      textColor = colors.text;
    }
  }

  // Contact card style
  if (message.type === 'contact') {
    return (
      <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}> 
        <View className="w-72 bg-blue-700 rounded-lg overflow-hidden">
          <View className="px-4 py-4 flex-row items-center">
            <View className="w-12 h-12 rounded-full items-center justify-center bg-blue-600 mr-3">
              <Text className="text-white font-bold">{(message.contactName || '').slice(0,2)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text className="text-white font-bold">{message.contactName}</Text>
            </View>
          </View>
          <View className="flex-row border-t border-blue-600">
            <TouchableOpacity className="flex-1 items-center py-3">
              <Text className="text-white">Kết bạn</Text>
            </TouchableOpacity>
            <View className="w-px bg-blue-600" />
            <TouchableOpacity className="flex-1 items-center py-3">
              <Text className="text-blue-200">Nhắn tin</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* reaction bubble */}
        <View className="ml-2 items-center justify-end">
          <View className="bg-slate-800 dark:bg-slate-700 rounded-full px-2 py-0.5">
            <Text className="text-white text-xs">♡</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}> 
      {!message.fromMe && (
        <View className="w-10 h-10 rounded-full items-center justify-center bg-gray-500">
          <Text className="text-white font-bold">A</Text>
        </View>
      )}

      <View style={{ maxWidth: '72%', marginLeft: isOutgoing ? 'auto' : 12 }} className={`${isOutgoing ? 'items-end' : 'items-start'}`}> 
          <View style={{ backgroundColor: bubbleBg, borderWidth: 1, borderColor, padding: 12, borderRadius: 18 }}>
          {message.type === 'sticker' ? (
            <Image source={{ uri: 'https://via.placeholder.com/120x120.png?text=STK' }} style={{ width: 120, height: 120, borderRadius: 12 }} />
          ) : (
            <Text style={{ color: textColor }}>{message.text}</Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
          <Text style={{ color: timeColor, fontSize: 12, marginRight: isOutgoing ? 0 : 8, marginLeft: isOutgoing ? 8 : 0 }}>{message.time}</Text>
          {message.reactions && message.reactions.length > 0 && (
            <View style={{ backgroundColor: scheme === 'dark' ? colors.surfaceVariant : '#F3F4F6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: colors.text }}>{message.reactions[0].emoji} {message.reactions[0].count ?? ''}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
