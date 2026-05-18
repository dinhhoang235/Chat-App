import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { getInitials } from '@/utils/initials';
import { getAvatarUrl } from '@/utils/avatar';
import { useRouter } from 'expo-router';
import { checkFriendshipStatus } from '@/services/friendship';
import { useCall } from '@/context/callContext';
import { chatApi } from '@/services/chat';
import { useAuth } from '@/context/authContext';

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

  const [isFriend, setIsFriend] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (sharedContact.id) {
      checkFriendshipStatus(sharedContact.id)
        .then(res => {
          if (mounted && ['friends', 'accepted', 'friend'].includes(res.status)) {
            setIsFriend(true);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setChecking(false);
        });
    } else {
      setChecking(false);
    }
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
    <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}>
        <View style={{ width: 288, backgroundColor: colors.tint, borderRadius: 12, overflow: 'hidden' }}>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.8} style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12, overflow: 'hidden' }}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1, paddingRight: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
                {fullName + ' '}
              </Text>
              {sharedContact.phone && (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {sharedContact.phone + ' '}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          
          {!isMe && (
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', backgroundColor: '#fff' }}>
              {checking ? (
                 <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 }}>
                   <ActivityIndicator size="small" color={colors.tint} />
                 </View>
              ) : isFriend ? (
                <TouchableOpacity onPress={handleCallPress} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 }}>
                  <Text style={{ color: colors.tint, fontWeight: '700' }} numberOfLines={1}>Gọi điện</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleProfilePress} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 }}>
                  <Text style={{ color: colors.tint, fontWeight: '700' }} numberOfLines={1}>Kết bạn </Text>
                </TouchableOpacity>
              )}
              <View style={{ width: 1, backgroundColor: colors.border || '#eee' }} />
              <TouchableOpacity onPress={handleMessagePress} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 }}>
                <Text style={{ color: colors.tint, fontWeight: '700' }} numberOfLines={1}>Nhắn tin </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </View>
  );
}
