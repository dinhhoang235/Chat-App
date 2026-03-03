import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/themeContext';
import type { FriendRequestItem } from '../services/friendship';

type Props = {
  request: FriendRequestItem;
  onAccept?: () => void;
  onDecline?: () => void;
  isSent?: boolean;
  avatar?: string;
  userId?: number;
};

export const FriendRequestRow: React.FC<Props> = ({ request, onAccept, onDecline, isSent = false, avatar, userId }) => {
  const { colors } = useTheme();
  const router = useRouter();
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

  const handleProfilePress = () => {
    if (userId) {
      router.push(`/profile/${userId}`);
    }
  };

  return (
    <View className="px-4 py-3" style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={handleProfilePress} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: request.color || '#6B7280', overflow: 'hidden' }}>
        {avatar ? (
          <Image
            source={{ uri: `${API_BASE_URL}${avatar}` }}
            style={{ width: 48, height: 48, borderRadius: 24 }}
          />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '700' }}>{request.initials}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleProfilePress} style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{request.name}</Text>
        {request.message ? (
          <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{request.message}</Text>
        ) : (
          <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{request.time}</Text>
        )}

        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          {isSent ? (
            <TouchableOpacity onPress={onDecline} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.surface }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Hủy</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={onDecline} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.surface }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Từ chối</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onAccept} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#2563EB' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Đồng ý</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};