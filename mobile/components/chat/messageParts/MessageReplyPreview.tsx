import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { getAvatarUrl } from '@/utils/avatar';

type MessageReplyPreviewProps = {
  replyTo: any;
  onReplyPress?: (id: string) => void;
  isOutgoing: boolean;
  colors: any;
  currentUserName?: string;
  contactNameFallback?: string;
  replyToSenderName?: string;
};

export default function MessageReplyPreview({ replyTo, onReplyPress, isOutgoing, colors, currentUserName, contactNameFallback, replyToSenderName }: MessageReplyPreviewProps) {
  if (!replyTo) return null;

  const displayName = replyTo.fromMe
    ? (replyTo.sender?.fullName || replyTo.contactName || currentUserName || 'Trả lời chính mình')
    : (replyTo.sender?.fullName || replyTo.contactName || replyToSenderName || contactNameFallback);

  const getThumbnailUri = () => {
    let url = replyTo.type === 'image_group' ? replyTo.images?.[0]?.fileInfo?.url : replyTo.fileInfo?.url;
    if (!url && replyTo.type === 'image') {
      try {
        const info = typeof replyTo.content === 'string' ? JSON.parse(replyTo.content) : replyTo.content;
        url = info?.url;
      } catch {
        url = replyTo.content;
      }
    }
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return getAvatarUrl(url) || url;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => replyTo.id && onReplyPress?.(replyTo.id)}
      style={{
        backgroundColor: isOutgoing ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        borderLeftWidth: 4,
        borderLeftColor: colors.tint,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {(replyTo.type === 'image' || replyTo.type === 'image_group') && (
        <View style={{ width: 36, height: 36, marginRight: 8, borderRadius: 4, overflow: 'hidden' }}>
          <Image
            source={{ uri: getThumbnailUri() }}
            style={{ width: '100%', height: '100%', backgroundColor: colors.surfaceVariant }}
            contentFit="cover"
          />
        </View>
      )}
      <View style={{ flexShrink: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: isOutgoing ? colors.bubbleMeText : colors.bubbleOtherText, marginBottom: 2 }}>
          {displayName}
        </Text>
        <Text style={{ fontSize: 13, color: isOutgoing ? colors.textSecondary : colors.textSecondary }} numberOfLines={1} ellipsizeMode="tail">
          {replyTo.type === 'text'
            ? replyTo.content?.replace(/\n/g, ' ')
            : replyTo.type === 'image' || replyTo.type === 'image_group'
            ? (() => {
                try {
                  const info = typeof replyTo.content === 'string' ? JSON.parse(replyTo.content) : replyTo.content;
                  if (info?.mime === 'image/gif' || info?.url?.toLowerCase().endsWith('.gif') || info?.name?.toLowerCase().endsWith('.gif')) {
                    return '[Gif]';
                  }
                } catch {}
                return '[Hình ảnh]';
              })()
            : replyTo.type === 'video'
            ? '[Video]'
            : replyTo.type === 'audio'
            ? '[Bản ghi âm]'
            : replyTo.type === 'location'
            ? '[Vị trí hiện tại]'
            : '[Tệp]'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
