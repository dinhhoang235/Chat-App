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

export default function MessageBubble({ message, onPress }: { message: ChatMessage, onPress?: () => void }) {
  const { colors } = useTheme();

  if (message.type === 'separator') {
    return (
      <View className="w-full items-center my-4">
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceVariant }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{message.text}</Text>
        </View>
      </View>
    );
  }

  const isOutgoing = !!message.fromMe;
  let bubbleBg = colors.bubbleOther;
  let borderColor = colors.surfaceVariant;
  let textColor = colors.bubbleOtherText;
  const timeColor = colors.textSecondary;

  if (isOutgoing) {
    bubbleBg = colors.bubbleMe;
    borderColor = colors.bubbleMe;
    textColor = colors.bubbleMeText;
  }

  // Contact card style
  if (message.type === 'contact') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}> 
          <View style={{ width: 288, backgroundColor: colors.tint, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint, marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{(message.contactName || '').slice(0,2)}</Text>
              </View>
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
          {/* reaction bubble */}
          <View style={{ marginLeft: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: colors.text }}>♡</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}> 
        {!message.fromMe && (
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVariant }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>A</Text>
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
              <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, color: colors.text }}>{message.reactions[0].emoji} {message.reactions[0].count ?? ''}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
