import React from 'react';
import { View, Image, Text } from 'react-native';
import { API_URL } from '../services/api';

interface ChatAvatarProps {
  avatar?: string | string[];
  name?: string;
  online?: boolean;
  size?: number;
  tintColor?: string;
  borderColor?: string;
}

export const ChatAvatar: React.FC<ChatAvatarProps> = ({ 
  avatar, 
  name, 
  online, 
  size = 40, 
  tintColor = '#007AFF',
  borderColor = '#fff'
}) => {
  const avatarStr = Array.isArray(avatar) ? avatar[0] : avatar;
  
  const avatarUrl = avatarStr
    ? (avatarStr.startsWith('http') 
        ? avatarStr 
        : `${API_URL}${avatarStr.startsWith('/') ? '' : '/'}${avatarStr}`)
    : undefined;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: tintColor }}>
      {avatarUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          key={avatarUrl}
          style={{ width: size, height: size, borderRadius: size / 2 }} 
        />
      ) : (
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>
          {(name || 'Z')[0].toUpperCase()}
        </Text>
      )}
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
