import React, { useState } from 'react';
import { View, Text, Switch, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { contacts } from '../../../constants/mockData';
import { useAuth } from '../../../context/authContext';
import ChatOptionRow from '../../../components/ChatOptionRow';
import { Header } from '../../../components/Header';
import PermissionSheet from '../../../components/PermissionSheet';

const Row = ChatOptionRow;

export default function GroupSettings() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params as any).id as string;

  const contact = contacts.find(c => c.id === id);
  const isOwner = !!contact?.ownerPhone && user?.phone === contact?.ownerPhone;

  // message settings
  const [highlightFromLeaders, setHighlightFromLeaders] = useState<boolean>(false);
  const [newMembersSeeRecent, setNewMembersSeeRecent] = useState<boolean>(true);

  // approval
  const requireApproval = !!contact?.requireApproval;

  // member permissions (stateful)
  const [permEditInfo, setPermEditInfo] = useState<string>('Tất cả mọi người');
  const [permPin, setPermPin] = useState<string>('Tất cả mọi người');
  const [permSend, setPermSend] = useState<string>('Tất cả mọi người');

  // permission modal state
  const [permissionModalVisible, setPermissionModalVisible] = useState<boolean>(false);
  const [permissionModalKey, setPermissionModalKey] = useState<string | null>(null);
  const permissionOptions = ['Tất cả mọi người', 'Chỉ trưởng và phó nhóm'];

  const confirmDisband = () => {
    Alert.alert('Giải tán nhóm', 'Bạn có chắc muốn giải tán nhóm này? Hành động không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Giải tán', style: 'destructive', onPress: () => { console.log('Group disbanded:', id); router.back(); } }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Cài đặt nhóm" showBack onBackPress={() => router.back()} />
      <ScrollView>
        <View style={{ padding: 16 }} >

          {/* Message settings */}
          <View className="mt-2" style={{ marginBottom: 6 }}>
            <Text style={{ color: colors.tint, fontWeight: '700', marginBottom: 6 }}>Thiết lập tin nhắn</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <Row
                icon="bookmark"
                title="Làm nổi tin nhắn từ trưởng và phó nhóm"
                rightNode={<Switch value={highlightFromLeaders} onValueChange={setHighlightFromLeaders} />}
                onPress={() => setHighlightFromLeaders(v => !v)}
              />
              <Row
                icon="history"
                title="Thành viên mới xem được tin gửi gần đây"
                rightNode={<Switch value={newMembersSeeRecent} onValueChange={setNewMembersSeeRecent} />}
                onPress={() => setNewMembersSeeRecent(v => !v)}
              />
            </View>
          </View>

          {/* Members */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.tint, fontWeight: '700', marginBottom: 6 }}>Thành viên</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <Row icon="people" title="Quản lý thành viên" onPress={() => router.push(`/chat/${id}/members`)} showChevron />
              <Row icon="how-to-reg" title="Duyệt thành viên" subtitle={requireApproval ? 'Đang bật' : 'Đã tắt'} onPress={() => router.push(`/chat/${id}/members/pending`)} showChevron />
              {isOwner && (
                <Row icon="transfer-within-a-station" title="Chuyển quyền trưởng nhóm" onPress={() => Alert.alert('Chuyển quyền', 'Chức năng mock')} showChevron />
              )}
            </View>
          </View>

          {/* Permissions */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.tint, fontWeight: '700', marginBottom: 6 }}>Quyền của thành viên</Text>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <Row icon="settings" title="Quyền sửa thông tin nhóm" subtitle={permEditInfo} onPress={() => { setPermissionModalKey('editInfo'); setPermissionModalVisible(true); }} showChevron />
              <Row icon="push-pin" title="Quyền ghim tin nhắn" subtitle={permPin} onPress={() => { setPermissionModalKey('pin'); setPermissionModalVisible(true); }} showChevron />
              <Row icon="chat" title="Quyền gửi tin nhắn" subtitle={permSend} onPress={() => { setPermissionModalKey('send'); setPermissionModalVisible(true); }} showChevron />
            </View>
          </View>

          {/* Disband / Delete */}
          {isOwner && (
            <View style={{ marginTop: 24 }}>
              <TouchableOpacity onPress={confirmDisband}>
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Giải tán nhóm</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Permission sheet */}
          <PermissionSheet
            visible={permissionModalVisible}
            onClose={() => { setPermissionModalVisible(false); setPermissionModalKey(null); }}
            title={permissionModalKey === 'editInfo' ? 'Quyền sửa thông tin nhóm' : permissionModalKey === 'pin' ? 'Quyền ghim tin nhắn' : 'Quyền gửi tin nhắn'}
            description={permissionModalKey === 'editInfo' ? 'Quyền sửa tên, ảnh đại diện, hình nền và thông tin khác' : undefined}
            options={permissionOptions}
            selected={permissionModalKey === 'editInfo' ? permEditInfo : permissionModalKey === 'pin' ? permPin : permSend}
            onSelect={(opt) => {
              if (permissionModalKey === 'editInfo') setPermEditInfo(opt);
              if (permissionModalKey === 'pin') setPermPin(opt);
              if (permissionModalKey === 'send') setPermSend(opt);
            }}
          />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}