import React from 'react';
import { View, Text, SectionList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useTheme } from '../context/themeContext';
import { friendRequests, friendRequestsSent } from '../constants/mockData';
import { FriendRequestRow } from '../components/FriendRequestRow';

export default function FriendRequests() {
  const { colors } = useTheme();
  const [tab, setTab] = React.useState<'received' | 'sent'>('received');

  const sections = React.useMemo(() => {
    if (tab === 'sent') return [{ title: 'Đã gửi', data: friendRequestsSent }];

    // group simple: first 3 into 'Tháng 1, 2026', rest into 'Cũ hơn'
    const recent = friendRequests.slice(0, 3);
    const older = friendRequests.slice(3);

    return [
      { title: 'Tháng 1, 2026', data: recent },
      { title: 'Cũ hơn', data: older },
    ];
  }, [tab]);

  const handleAccept = (id: string) => {
    console.log('Accept', id);
  };

  const handleDecline = (id: string) => {
    console.log('Decline', id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Lời mời kết bạn" showBack />

      <View style={{ paddingHorizontal: 16, paddingTop: 4, marginTop: 0 }}>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: 0 }}>
          <TouchableOpacity onPress={() => setTab('received')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: tab === 'received' ? colors.text : colors.textSecondary, fontWeight: tab === 'received' ? '700' : '600' }}>
              Đã nhận <Text style={{ color: tab === 'received' ? colors.text : colors.textSecondary, fontWeight: '700' }}>({friendRequests.length})</Text>
            </Text>
            <View style={{ marginTop: 6, height: 2, width: '60%', backgroundColor: tab === 'received' ? '#2563EB' : 'transparent', borderRadius: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setTab('sent')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: tab === 'sent' ? colors.text : colors.textSecondary, fontWeight: tab === 'sent' ? '700' : '600' }}>
              Đã gửi <Text style={{ color: tab === 'sent' ? colors.text : colors.textSecondary, fontWeight: '700' }}>({friendRequestsSent.length})</Text>
            </Text>
            <View style={{ marginTop: 6, height: 2, width: '60%', backgroundColor: tab === 'sent' ? '#2563EB' : 'transparent', borderRadius: 2 }} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        sections={sections}
        contentContainerStyle={{ paddingTop: 0, paddingBottom: 12 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FriendRequestRow
            request={item}
            onAccept={() => handleAccept(item.id)}
            onDecline={() => handleDecline(item.id)}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{title}</Text>
          </View>
        )}
        ListFooterComponent={() => (
          <TouchableOpacity style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>XEM THÊM</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}