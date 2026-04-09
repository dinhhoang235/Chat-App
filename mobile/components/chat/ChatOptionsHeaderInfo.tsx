import React from 'react';
import { View, Text } from 'react-native';
import { GroupAvatar, ChatAvatar } from '@/components/avatars';

interface ChatOptionsHeaderInfoProps {
  isGroup: boolean;
  groupAvatars: (string | any)[];
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
          ) : (
            <ChatAvatar
              avatar={avatar}
              name={name}
              online={isOnline}
              size={96}
              tintColor={colors.tint}
              borderColor={colors.background}
            />
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
