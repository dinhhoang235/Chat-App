import React from 'react';
import { View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { getAvatarUrl } from '@/utils/avatar';

interface ChatAvatarProps {
  avatar?: string | string[];
  name?: string;
  online?: boolean;
  size?: number;
  tintColor?: string;
  borderColor?: string;
}

const ChatAvatar = ({ 
  avatar, 
  name, 
  online, 
  size = 40, 
  tintColor = '#0084FF',
  borderColor = '#fff'
}: ChatAvatarProps) => {
  const avatarStr = Array.isArray(avatar) ? avatar[0] : avatar;

  const avatarUrl = avatarStr ? getAvatarUrl(avatarStr) : undefined;

  // Fallback to server default avatar (served via /storage proxy or CDN)
  const DEFAULT_FALLBACK_PATH = '/storage/chatapp/default_avatar.png';
  const fallbackUrl = getAvatarUrl(DEFAULT_FALLBACK_PATH) || undefined;

  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', overflow: 'hidden' }}>
        <ExpoImage
          source={{ uri: (avatarUrl || fallbackUrl) as string | undefined }}
          key={(avatarUrl || fallbackUrl) as string | undefined}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          cachePolicy="disk"
          priority="high"
          contentFit="cover"
          transition={200}
        />
      </View>
      {/* online indicator */}
      {online && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: (size * 0.3) / 2,
            backgroundColor: '#4CAF50',
            borderWidth: 2,
            borderColor: borderColor
          }}
        />
      )}
    </View>
  );
};

export default ChatAvatar;
