import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { getAvatarUrl, getDefaultAvatarUrl } from '@/utils/avatar';
import { Image } from 'expo-image';

type MessageFooterProps = {
  message: any;
  isOutgoing: boolean;
  isLastInGroup?: boolean;
  isThreadLast?: boolean;
  colors: any;
  timeColor: string;
  onRetry?: (message: any) => void;
};

export default function MessageFooter({ message, isOutgoing, isLastInGroup, isThreadLast, colors, timeColor, onRetry }: MessageFooterProps) {
  if (!isLastInGroup) return null;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
        <Pressable onPress={() => onRetry?.(message)}>
          <Text style={{ color: message.status === 'error' ? '#FF4444' : timeColor, fontSize: 12, marginRight: isOutgoing ? 0 : 8, marginLeft: isOutgoing ? 8 : 0 }}>
            {message.status === 'sending' ? (
              <Text style={{ color: timeColor, fontSize: 12 }}>Đang gửi</Text>
            ) : message.status === 'error' ? (
              <Text style={{ color: '#FF4444', fontSize: 12 }}>Gửi lỗi</Text>
            ) : (isOutgoing && isThreadLast) ? (
              (message.seenBy && message.seenBy.length > 0) ? '' : 'Đã gửi'
            ) : message.time}
          </Text>
        </Pressable>

      </View>

      {isOutgoing && isThreadLast && message.seenBy && message.seenBy.length > 0 && (
        <View style={{ flexDirection: 'row', marginTop: -12, justifyContent: 'flex-end', paddingBottom: 4 }}>
          {[...message.seenBy]
            .sort((a: any, b: any) => {
              const timeA = a.seenAt ? new Date(a.seenAt).getTime() : 0;
              const timeB = b.seenAt ? new Date(b.seenAt).getTime() : 0;
              if (timeA !== timeB) return timeA - timeB;
              return a.id - b.id;
            })
            .map((u: any, idx: number) => (
              <View
                key={u.id}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: 'transparent',
                  marginLeft: idx > 0 ? -8 : 0,
                  borderWidth: 0,
                  borderColor: 'transparent',
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
                <Image source={{ uri: getDefaultAvatarUrl() }} style={{ width: 24, height: 24, borderRadius: 12 }} />
              )}
            </View>
          ))}
        </View>
      )}
    </>
  );
}
