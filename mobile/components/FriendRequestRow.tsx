import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/themeContext';
import type { FriendRequest } from '../constants/mockData';

type Props = {
  request: FriendRequest;
  onAccept?: () => void;
  onDecline?: () => void;
};

export const FriendRequestRow: React.FC<Props> = ({ request, onAccept, onDecline }) => {
  const { colors } = useTheme();

  return (
    <View className="px-4 py-3" style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: request.color || '#6B7280' }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{request.initials}</Text>
      </View>

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{request.name}</Text>
        {request.message ? (
          <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{request.message}</Text>
        ) : (
          <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{request.time}</Text>
        )}

        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          <TouchableOpacity onPress={onDecline} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.surface }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onAccept} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#2563EB' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Đồng ý</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};