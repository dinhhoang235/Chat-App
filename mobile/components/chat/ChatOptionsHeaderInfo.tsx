import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { GroupAvatar, ChatAvatar } from '@/components/avatars';
import {
  getLocalCompositePath,
  prefetchComposite,
} from '@/utils/groupCompositeCache';

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
  const [localComposite, setLocalComposite] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!isGroup) return;
    const convId = avatar ? avatar.split('/').pop() : null; // best-effort id extract
    const compositeUrl = avatar;
    if (!compositeUrl) return;
    (async () => {
      const local = await getLocalCompositePath(convId || name, compositeUrl).catch(() => null);
      if (mounted && local) setLocalComposite(local);
      if (!local) {
        void prefetchComposite(convId || name, compositeUrl).then((p) => {
          if (mounted && p) setLocalComposite(p);
        }).catch(() => null);
      }
    })();
    return () => { mounted = false; };
  }, [avatar, isGroup, name]);
  

  return (
    <View className="items-center px-4 py-3">
      <View>
        <View
          className="w-24 h-24 rounded-full mb-3 items-center justify-center"
          style={{ backgroundColor: isGroup ? 'transparent' : colors.surfaceVariant }}
        >
          {isGroup ? (
              // Prefer local cached composite file:// if available, otherwise server composite `avatar` prop
              (localComposite || avatar) ? (
                <ChatAvatar
                  avatar={localComposite || avatar}
                  name={name}
                  online={isOnline}
                  size={96}
                  tintColor={colors.tint}
                  borderColor={colors.background}
                />
              ) : (
                <GroupAvatar avatars={groupAvatars} membersCount={membersCount} size={96} />
              )
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
      </View>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{displayName ?? name}</Text>
    </View>
  );
};

export default ChatOptionsHeaderInfo;
