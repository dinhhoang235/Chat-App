import React from 'react';
import { View, Text, Image } from 'react-native';
import { GroupAvatar } from '@/components/avatars';
import { getInitials } from '@/utils/initials';

interface ChatOptionsHeaderInfoProps {
  isGroup: boolean;
  groupAvatars: string[];
  membersCount: number;
  avatar?: string;
  isOnline?: boolean;
  name: string;
  displayName?: string;
  colors: any;
}
const ChatOptionsHeaderInfo = ({
  isGroup,
  groupAvatars,
  membersCount,
  avatar,
  isOnline,
  name,
  displayName,
  colors,
}: ChatOptionsHeaderInfoProps) => {
  

  return (
    <View className="items-center px-4 py-3">
      <View>
        <View
          className="w-24 h-24 rounded-full mb-3 items-center justify-center"
          style={{ backgroundColor: isGroup ? 'transparent' : colors.surfaceVariant }}
        >
          {isGroup ? (
            <GroupAvatar avatars={groupAvatars} membersCount={membersCount} size={96} />
          ) : avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 96, height: 96, borderRadius: 48 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>{getInitials(name)}</Text>
            </View>
          )}
        </View>
        {!isGroup && isOnline && (
          <View
            className="absolute right-1 bottom-3 w-6 h-6 rounded-full border-4"
            style={{
              backgroundColor: '#4ade80',
              borderColor: colors.background,
            }}
          />
        )}
      </View>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{displayName ?? name}</Text>
    </View>
  );
};

export default ChatOptionsHeaderInfo;
