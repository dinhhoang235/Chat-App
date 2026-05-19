import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { getInitials } from '@/utils/initials';
import { getAvatarUrl } from '@/utils/avatar';
import { useRouter } from 'expo-router';
import { checkFriendshipStatus } from '@/services/friendship';
import { useCall } from '@/context/callContext';
import { chatApi } from '@/services/chat';
import { useAuth } from '@/context/authContext';

const friendshipStatusCache: { [userId: number]: boolean } = {};

type MessageContactBubbleProps = {
  message: any;
  onPress?: () => void;
  onAvatarPress?: () => void;
  colors: any;
};

export default function MessageContactBubble({
  message,
  onPress,
  onAvatarPress,
  colors,
}: MessageContactBubbleProps) {
  const router = useRouter();
  const { startCall } = useCall();
  const { user } = useAuth();
  const sharedContact = message.sharedContact || {};
  const fullName = sharedContact.fullName || 'Người dùng';
  const avatar = sharedContact.avatar ? getAvatarUrl(sharedContact.avatar) : undefined;
  const initials = getInitials(fullName);

  const isMe = Number(sharedContact.id) === Number(user?.id);

  const [isFriend, setIsFriend] = useState(() => {
    if (sharedContact.id && friendshipStatusCache[sharedContact.id] !== undefined) {
      return friendshipStatusCache[sharedContact.id];
    }
    return true; // Default to true (Gọi điện) so we don't show a loading spinner or Kết bạn button initially
  });

  useEffect(() => {
    let mounted = true;
    if (!sharedContact.id) return;

    if (friendshipStatusCache[sharedContact.id] !== undefined) {
      return;
    }

    checkFriendshipStatus(sharedContact.id)
      .then(res => {
        const isFriendRes = ['friends', 'accepted', 'friend'].includes(res.status);
        friendshipStatusCache[sharedContact.id] = isFriendRes;
        if (mounted) {
          setIsFriend(isFriendRes);
        }
      })
      .catch(() => {});
      
    return () => { mounted = false; };
  }, [sharedContact.id]);

  const handleCallPress = async () => {
    if (!sharedContact.id) return;
    try {
      const response = await chatApi.startConversation(Number(sharedContact.id));
      const convId = response.data.id || response.data.conversationId;
      if (convId) {
        startCall({
          conversationId: convId,
          callType: 'voice',
          remoteUserId: Number(sharedContact.id),
          remoteName: fullName,
          remoteAvatar: sharedContact.avatar
        });
      }
    } catch (err) {
      console.log('Error starting call from contact card:', err);
    }
  };

  const handleProfilePress = () => {
    if (onPress) onPress();
    if (sharedContact.id) {
      if (isMe) {
        router.push('/profile/me');
      } else {
        router.push(`/profile/${sharedContact.id}`);
      }
    }
  };

  const handleMessagePress = () => {
    if (sharedContact.id) {
      router.push({
        pathname: '/chat/new',
        params: {
          targetUserId: sharedContact.id.toString(),
          name: sharedContact.fullName || 'Người dùng',
          avatar: sharedContact.avatar || '',
        }
      });
    }
  };

  return (
    <View style={{ width: 240, backgroundColor: colors.tint, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.tint }}>
      <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.8} style={{ paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: '#fff' }}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1, paddingRight: 4 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
            {fullName + ' '}
          </Text>
          {sharedContact.phone && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 }} numberOfLines={1}>
              {sharedContact.phone + ' '}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      
      {!isMe && (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', backgroundColor: '#fff' }}>
          {isFriend ? (
            <TouchableOpacity onPress={handleCallPress} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
              <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>Gọi điện</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleProfilePress} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
              <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>Kết bạn </Text>
            </TouchableOpacity>
          )}
          <View style={{ width: 1, backgroundColor: colors.border || '#eee' }} />
          <TouchableOpacity onPress={handleMessagePress} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
            <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>Nhắn tin </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
