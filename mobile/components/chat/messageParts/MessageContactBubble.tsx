import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getInitials } from '@/utils/initials';

type MessageContactBubbleProps = {
  message: any;
  onPress?: () => void;
  onAvatarPress?: () => void;
  colors: any;
};

export default function MessageContactBubble({
  message,
  onPress,
  onAvatarPress,
  colors,
}: MessageContactBubbleProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}>
        <View style={{ width: 288, backgroundColor: colors.tint, borderRadius: 12, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint, marginRight: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{getInitials(message.contactName)}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{message.contactName}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.tint }}>
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ color: '#fff' }}>Kết bạn</Text>
            </TouchableOpacity>
            <View style={{ width: 1, backgroundColor: colors.tint }} />
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Nhắn tin</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginLeft: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: colors.text }}>♡</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
