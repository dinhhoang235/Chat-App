import React from 'react';
import { View, Text } from 'react-native';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';
import { Image } from 'expo-image';

type MessageFooterProps = {
  message: any;
  isOutgoing: boolean;
  isLastInGroup?: boolean;
  isThreadLast?: boolean;
  colors: any;
  timeColor: string;
};

export default function MessageFooter({ message, isOutgoing, isLastInGroup, isThreadLast, colors, timeColor }: MessageFooterProps) {
  if (!isLastInGroup) return null;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
        <Text style={{ color: timeColor, fontSize: 12, marginRight: isOutgoing ? 0 : 8, marginLeft: isOutgoing ? 8 : 0 }}>
          {message.status === 'sending' ? (
            <Text style={{ color: timeColor, fontSize: 12 }}>Đang gửi</Text>
          ) : (isOutgoing && isThreadLast) ? (
            (message.seenBy && message.seenBy.length > 0) ? '' : 'Đã gửi'
          ) : message.time}
        </Text>
        {message.reactions && message.reactions.length > 0 && (
          <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: colors.text }}>{message.reactions[0].emoji} {message.reactions[0].count ?? ''}</Text>
          </View>
        )}
      </View>

      {isOutgoing && isThreadLast && message.seenBy && message.seenBy.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: -12, justifyContent: 'flex-end', paddingBottom: 4 }}>
          {message.seenBy.map((u: any, idx: number) => (
            <View
              key={u.id}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.surfaceVariant,
                marginLeft: idx > 0 ? -8 : 0,
                borderWidth: 1.5,
                borderColor: colors.background,
                overflow: 'hidden',
              }}
            >
              {u.avatar ? (
                <Image
                  source={{ uri: getAvatarUrl(u.avatar) || undefined }}
                  style={{ width: 24, height: 24 }}
                  onError={(e) => console.log('Avatar load error:', e)}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{getInitials(u.fullName)}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </>
  );
}
