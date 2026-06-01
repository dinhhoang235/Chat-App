import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Header, GroupAvatar, ChatAvatar } from '@/components';

export default function ChatHeader(props: any) {
  const {
    isGroup,
    router,
    paramName,
    targetUser,
    params,
    targetUserIdState,
    membersCount,
    groupAvatars,
    colors,
    targetUserStatus,
    statusText,
    handleGroupVideoHeaderPress,
    isActiveGroupCall,
    setSearchMode,
    id,
    targetUserId,
    startVoiceCall,
    startVideoCall,
  } = props;

  return (
    <Header
      showBack
      leftElement={
        <TouchableOpacity
          onPress={() => {
            const finalTargetUserId = targetUserIdState;
            if (isGroup) {
              router.push({
                pathname: '/chat/[id]/options',
                params: {
                  id,
                  name: paramName || targetUser?.fullName,
                  avatar: targetUser?.avatar || params.avatar,
                  targetUserId: targetUserId,
                  status: targetUserStatus?.status,
                  isGroup: 'true',
                  membersCount: membersCount,
                  avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars,
                },
              } as any);
            } else if (finalTargetUserId) {
              router.push(`/profile/${finalTargetUserId}`);
            }
          }}
          activeOpacity={1}
          className="flex-row items-center"
        >
          {isGroup ? (
            <GroupAvatar avatars={groupAvatars} size={44} membersCount={membersCount} borderColor={colors.header} />
          ) : (
            <ChatAvatar avatar={targetUser?.avatar || (params.avatar as string)} name={paramName || targetUser?.fullName} online={!isGroup && targetUserStatus?.status === 'online'} size={44} tintColor={colors.tint} borderColor={colors.header} />
          )}
          <View style={{ marginLeft: 8 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{paramName || targetUser?.fullName || 'Chat'}</Text>
            {isGroup ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>{membersCount} thành viên</Text>
            ) : statusText && (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>{statusText}</Text>
            )}
          </View>
        </TouchableOpacity>
      }
      onBackPress={() => {
        if ((params as any)?.fromProfile === 'true') {
          router.replace('/(tabs)');
        } else {
          router.back();
        }
      }}
      rightActions={isGroup ? [
        { icon: 'video', onPress: handleGroupVideoHeaderPress, active: isActiveGroupCall },
        { icon: 'search', onPress: () => setSearchMode(true) },
        {
          icon: 'bars',
          onPress: () => router.push({
            pathname: '/chat/[id]/options',
            params: {
              id,
              name: paramName || targetUser?.fullName,
              avatar: targetUser?.avatar || params.avatar,
              targetUserId: targetUserId,
              status: targetUserStatus?.status,
              isGroup: isGroup ? 'true' : 'false',
              membersCount: membersCount,
              avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars,
            }
          } as any)
        },
      ] : [
        { icon: 'call-outline', onPress: startVoiceCall },
        { icon: 'video', onPress: startVideoCall },
        {
          icon: 'bars',
          onPress: () => router.push({
            pathname: '/chat/[id]/options',
            params: {
              id,
              name: paramName || targetUser?.fullName,
              avatar: targetUser?.avatar || params.avatar,
              targetUserId: targetUserId,
              status: targetUserStatus?.status,
              isGroup: isGroup ? 'true' : 'false',
              membersCount: membersCount,
              avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars,
            }
          } as any)
        },
      ]}
    />
  );
}
