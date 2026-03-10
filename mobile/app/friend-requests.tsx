import React, { useCallback } from 'react';
import { View, Text, SectionList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header, FriendRequestRow } from '@/components';
import { useTheme } from '@/context/themeContext';
import { useTabBar } from '@/context/tabBarContext';
import { useFocusEffect } from 'expo-router';
import { getPendingFriendRequests, getSentFriendRequests, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest } from '@/services/friendship';
import type { FriendRequest } from '@/services/friendship';

export default function FriendRequests() {
  const { colors } = useTheme();
  const [tab, setTab] = React.useState<'received' | 'sent'>('received');
  const { tabBarHeight } = useTabBar();
  const [receivedRequests, setReceivedRequests] = React.useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = React.useState<FriendRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Load both received and sent requests to update counts
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [received, sent] = await Promise.all([
        getPendingFriendRequests(),
        getSentFriendRequests()
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (err) {
      setError('Không thể tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load current tab whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const handleAccept = async (request: FriendRequest) => {
    try {
      await acceptFriendRequest(request.senderId);
      setReceivedRequests(receivedRequests.filter(r => r.id !== request.id));
      Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');
    } catch {
      setError('Chấp nhận lời mời thất bại');
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời kết bạn');
    }
  };

  const handleDecline = async (request: FriendRequest) => {
    try {
      await rejectFriendRequest(request.senderId);
      setReceivedRequests(receivedRequests.filter(r => r.id !== request.id));
      Alert.alert('Thành công', 'Đã từ chối lời mời kết bạn');
    } catch {
      setError('Từ chối lời mời thất bại');
      Alert.alert('Lỗi', 'Không thể từ chối lời mời kết bạn');
    }
  };

  const handleCancel = async (request: FriendRequest) => {
    try {
      await cancelFriendRequest(request.receiverId);
      setSentRequests(sentRequests.filter(r => r.id !== request.id));
      Alert.alert('Thành công', 'Đã hủy lời mời kết bạn');
    } catch {
      setError('Hủy lời mời thất bại');
      Alert.alert('Lỗi', 'Không thể hủy lời mời kết bạn');
    }
  };

  const sections = React.useMemo(() => {
    if (tab === 'sent') {
      return sentRequests.length > 0 
        ? [{ title: 'Đã gửi', data: sentRequests }]
        : [];
    }

    if (receivedRequests.length === 0) return [];

    // group by date: first 3 into recent, rest into older
    const recent = receivedRequests.slice(0, 3);
    const older = receivedRequests.slice(3);

    const result = [
      { title: 'Tháng 1, 2026', data: recent },
    ];

    if (older.length > 0) {
      result.push({ title: 'Cũ hơn', data: older });
    }

    return result;
  }, [tab, receivedRequests, sentRequests]);

  const currentData = tab === 'received' ? receivedRequests : sentRequests;
  const currentHandleDecline = tab === 'received' 
    ? (request: FriendRequest) => handleDecline(request)
    : (request: FriendRequest) => handleCancel(request);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Lời mời kết bạn" showBack />

      <View style={{ paddingHorizontal: 16, paddingTop: 4, marginTop: 0 }}>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: 0 }}>
          <TouchableOpacity onPress={() => setTab('received')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: tab === 'received' ? colors.text : colors.textSecondary, fontWeight: tab === 'received' ? '700' : '600' }}>
              Đã nhận <Text style={{ color: tab === 'received' ? colors.text : colors.textSecondary, fontWeight: '700' }}>({receivedRequests.length})</Text>
            </Text>
            <View style={{ marginTop: 6, height: 2, width: '60%', backgroundColor: tab === 'received' ? '#2563EB' : 'transparent', borderRadius: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setTab('sent')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: tab === 'sent' ? colors.text : colors.textSecondary, fontWeight: tab === 'sent' ? '700' : '600' }}>
              Đã gửi <Text style={{ color: tab === 'sent' ? colors.text : colors.textSecondary, fontWeight: '700' }}>({sentRequests.length})</Text>
            </Text>
            <View style={{ marginTop: 6, height: 2, width: '60%', backgroundColor: tab === 'sent' ? '#2563EB' : 'transparent', borderRadius: 2 }} />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={{ backgroundColor: '#FEE2E2', margin: 16, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: '#DC2626' }}>{error}</Text>
        </View>
      )}

      {loading && receivedRequests.length === 0 && sentRequests.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : currentData.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {tab === 'received' ? 'Không có lời mời nào' : 'Chưa gửi lời mời nào'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: tabBarHeight + 8 }}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const request = item as FriendRequest;
            const user = tab === 'received' ? request.sender : request.receiver;
            const initials = user?.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'U';
            const time = new Date(request.createdAt).toLocaleDateString('vi-VN');
            
            return (
              <FriendRequestRow
                request={{ 
                  id: request.id.toString(),
                  name: user?.fullName || '', 
                  phone: user?.phone || '', 
                  time,
                  initials,
                  color: '#6B7280'
                }}
                avatar={user?.avatar}
                userId={user?.id}
                isSent={tab === 'sent'}
                onAccept={() => handleAccept(request)}
                onDecline={() => currentHandleDecline(request)}
              />
            );
          }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{title}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}