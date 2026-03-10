import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/authContext';
import { Header, MemberActionsSheet, AddToGroupModal } from '@/components';
import { chatApi } from '@/services/chat';
import { getInitials } from '@/utils/initials';
import { getAvatarUrl } from '@/utils/avatar';

export default function MembersScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params as any).id as string;
  const mode = (params as any).mode as string | undefined;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatApi.getConversationDetails(id);
      const data = response.data;
      
      // Determine if current user is owner/admin
      const currentUserPart = data.participants.find((p: any) => p.userId.toString() === user?.id?.toString());
      setCurrentUserRole(currentUserPart?.role || 'member');
      setIsOwner(currentUserPart?.role === 'owner');

      setMembers(data.participants.map((p: any) => ({
        ...p.user,
        role: p.role
      })));
    } catch (err) {
      console.error('Fetch members error:', err);
      Alert.alert('Lỗi', 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const [tab, setTab] = useState<'all'|'owners'|'invited'|'blocked'>(mode === 'pending' ? 'invited' : 'all');
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Filter members based on role
  const filteredOwners = members.filter(m => m.role === 'owner' || m.role === 'admin');

  const removeMember = (mid: number) => {
    if (!isOwner) {
      Alert.alert('Lỗi', 'Chỉ trưởng nhóm mới có quyền xóa thành viên');
      return;
    }
    
    // Don't allow removing yourself
    if (mid.toString() === user?.id?.toString()) {
      return;
    }

    Alert.alert('Xác nhận', `Bạn có chắc muốn xóa ${members.find(m => m.id === mid)?.fullName} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await chatApi.removeMember(id, mid);
          setMembers(prev => prev.filter(m => m.id !== mid));
        } catch {
          Alert.alert('Lỗi', 'Không thể xóa thành viên');
        }
      }}
    ]);
  };

  const addMembers = async (selectedIds: (string | number)[]) => {
    try {
      await chatApi.addMembers(id, selectedIds);
      Alert.alert('Thành công', 'Đã thêm thành viên vào nhóm');
      fetchMembers();
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm thành viên');
    }
  };

  const displayed = tab === 'all' ? members : (tab === 'owners' ? filteredOwners : []); 

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Quản lý thành viên"
        subtitle={`${members.length} thành viên`}
        showBack
        onBackPress={() => router.back()}
        onAddPress={() => (currentUserRole === 'owner' || currentUserRole === 'admin') ? setAddModalVisible(true) : undefined}
        addIconName="person-add"
      />

      <View style={{ padding: 12, flex: 1 }}>

        {/* top action row (large) */}
        {currentUserRole === 'owner' ? (
          <TouchableOpacity onPress={() => router.push(`/chat/${id}/members/pending`)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: colors.surface, marginBottom: 12, borderWidth: 1, borderColor: colors.surfaceVariant }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <MaterialIcons name="how-to-reg" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Duyệt thành viên</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Phê duyệt người mới tham gia</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}

        {/* tabs */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => setTab('all')} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: tab === 'all' ? colors.tint : colors.textSecondary, fontWeight: tab === 'all' ? '700' : '600' }}>Tất cả</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('owners')} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: tab === 'owners' ? colors.tint : colors.textSecondary, fontWeight: tab === 'owners' ? '700' : '600' }}>Trưởng và phó nhóm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('invited')} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: tab === 'invited' ? colors.tint : colors.textSecondary, fontWeight: tab === 'invited' ? '700' : '600' }}>Đã mời</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('blocked')} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: tab === 'blocked' ? colors.tint : colors.textSecondary, fontWeight: tab === 'blocked' ? '700' : '600' }}>Đã chặn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* section header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Thành viên <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>({members.length})</Text></Text>
          <TouchableOpacity onPress={() => console.log('Members menu')}>
            <MaterialIcons name="more-vert" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* list */}
        {displayed.length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Không có mục nào</Text>
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={(i: any) => i.id.toString()}
            renderItem={({ item }: any) => {
              const avatarUrl = getAvatarUrl(item.avatar);
              const initials = getInitials(item.fullName);

              return (
                <TouchableOpacity onPress={() => { setSelectedMember(item); setMemberModalVisible(true); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#fff' }}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
                      )}
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item.phone === user?.phone ? 'Bạn' : item.fullName}</Text>
                        {item.role === 'owner' && (
                          <View style={{ marginLeft: 6, backgroundColor: colors.tint + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: colors.tint, fontSize: 10, fontWeight: '700' }}>Trưởng nhóm</Text>
                          </View>
                        )}
                        {item.role === 'admin' && (
                          <View style={{ marginLeft: 6, backgroundColor: colors.success + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>Phó nhóm</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: colors.textSecondary }}>{item.phone ?? ''}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <MemberActionsSheet
          visible={memberModalVisible}
          onClose={() => setMemberModalVisible(false)}
          member={selectedMember}
          isOwner={isOwner}
          onPromote={(id) => {
            Alert.alert('Phó nhóm', `${members.find(m => m.id === id)?.fullName} đã được bổ nhiệm làm phó nhóm (mock)`);
          }}
          onBlock={(id) => {
            Alert.alert('Chặn', `${members.find(m => m.id === id)?.fullName} đã bị chặn (mock)`);
          }}
          onRemove={(id) => {
            removeMember(id);
          }}
          onViewProfile={(id) => router.push(`/profile/${id}`)}
        />

        <AddToGroupModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSave={addMembers}
          conversationId={id}
        />
      </View>
    </SafeAreaView>
  );
}