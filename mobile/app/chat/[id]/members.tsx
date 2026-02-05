import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { contacts } from '../../../constants/mockData';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../context/authContext';
import { Header } from '../../../components/Header';
import MemberActionsSheet from '../../../components/MemberActionsSheet';
import AddToGroupModal from '../../../components/AddToGroupModal';

export default function MembersScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params as any).id as string;
  const mode = (params as any).mode as string | undefined;

  const contact = contacts.find(c => c.id === id);
  const isOwner = !!contact?.ownerPhone && user?.phone === contact?.ownerPhone;

  const [members, setMembers] = useState<string[]>(contact?.members ?? []);
  const [pending, setPending] = useState<string[]>(contact?.pendingMembers ?? []);

  const getContact = (cid: string) => contacts.find(c => c.id === cid);

  const isDefined = <T,>(v: T | null | undefined): v is T => v != null;

  // helper: derive initials from full name (used when showing current user's name)
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).map(n => n[0]).slice(0,2).join('').toUpperCase();
  };

  const approve = (cid: string) => {
    setMembers(prev => [...prev, cid]);
    setPending(prev => prev.filter(p => p !== cid));
    Alert.alert('Đã phê duyệt', `${getContact(cid)?.name ?? cid} đã vào nhóm`);
  };

  const reject = (cid: string) => {
    setPending(prev => prev.filter(p => p !== cid));
    Alert.alert('Từ chối', `${getContact(cid)?.name ?? cid} đã bị từ chối`);
  };

  const removeMember = (cid: string) => {
    Alert.alert('Xác nhận', `Bạn có chắc muốn xóa ${getContact(cid)?.name ?? cid} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => setMembers(prev => prev.filter(m => m !== cid)) }
    ]);
  };

  const [tab, setTab] = useState<'all'|'owners'|'invited'|'blocked'>(mode === 'pending' ? 'invited' : 'all');
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Ensure owner and current user appear in the resolved members list even if not present in the stored `members` array
  const ownerContact = contact?.ownerPhone ? contacts.find(c => c.phone === contact.ownerPhone) : undefined;
  const userContact = user?.phone ? contacts.find(c => c.phone === user.phone) : undefined;
  // Put current user at the front of the list (if present), then keep existing members and owner
  const combinedMemberIds = Array.from(new Set([userContact?.id, ...(members ?? []), ownerContact?.id].filter(isDefined)));
  const membersResolved = combinedMemberIds.map(m => getContact(m)).filter(isDefined);
  const pendingResolved = Array.from(new Set([...(pending ?? [])])).map(m => getContact(m)).filter(isDefined);

  const displayed = tab === 'all' ? membersResolved : (tab === 'owners' ? membersResolved.filter(m => m?.phone === contact?.ownerPhone) : (tab === 'invited' ? pendingResolved : []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="Quản lý thành viên"
        subtitle={`${contact?.membersCount ?? members.length} thành viên`}
        showBack
        onBackPress={() => router.back()}
        onAddPress={() => isOwner ? setAddModalVisible(true) : undefined}
        addIconName="person-add"
      />

      {/* Add to group modal */}

      <View style={{ padding: 12 }}>

        {/* top action row (large) */}
        {isOwner ? (
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
              <Text style={{ color: tab === 'invited' ? colors.tint : colors.textSecondary, fontWeight: tab === 'invited' ? '700' : '600' }}>Đã mời <Text style={{ color: colors.textSecondary }}>({pending.length})</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('blocked')} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
              <Text style={{ color: tab === 'blocked' ? colors.tint : colors.textSecondary, fontWeight: tab === 'blocked' ? '700' : '600' }}>Đã chặn</Text>
            </TouchableOpacity>
          </View>


        </View>

        {/* section header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Thành viên <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>({contact?.membersCount ?? members.length})</Text></Text>
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
            keyExtractor={(i: any) => i.id}
            renderItem={({ item }: any) => (
              tab === 'invited' ? (
                <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: item?.color ?? '#6B7280', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>{item?.initials ?? 'U'}</Text>
                      </View>
                      <View>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item?.name}</Text>
                        <Text style={{ color: colors.textSecondary }}>{item?.phone ?? ''}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => approve(item.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, backgroundColor: colors.tint, borderRadius: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Phê duyệt</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => reject(item.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.surfaceVariant }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>Từ chối</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setSelectedMember(item); setMemberModalVisible(true); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: item?.color ?? '#6B7280', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' }}>
                      {/* placeholder avatar - replace with Image when available */}
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{item?.phone === user?.phone ? getInitials(user?.fullName) : (item?.initials ?? 'U')}</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item?.phone === user?.phone ? 'Bạn' : item?.name}</Text>
                        {item?.phone === contact?.ownerPhone ? (
                          <Text style={{ color: colors.tint, marginLeft: 8, fontSize: 12 }}>Trưởng nhóm</Text>
                        ) : null}
                      </View>
                      <Text style={{ color: colors.textSecondary }}>{item?.phone ?? ''}</Text>
                    </View>
                  </View>

                </TouchableOpacity>
              )
            )}
          />
        )}

        <MemberActionsSheet
          visible={memberModalVisible}
          onClose={() => setMemberModalVisible(false)}
          member={selectedMember}
          isOwner={isOwner}
          onPromote={(id) => {
            Alert.alert('Phó nhóm', `${getContact(id)?.name ?? id} đã được bổ nhiệm làm phó nhóm (mock)`);
          }}
          onBlock={(id) => {
            Alert.alert('Chặn', `${getContact(id)?.name ?? id} đã bị chặn (mock)`);
          }}
          onRemove={(id) => {
            removeMember(id);
          }}
          onViewProfile={(id) => router.push(`/profile/${id}`)}
        />

        <AddToGroupModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSave={(selectedIds) => {
            // mock behaviour: add selected IDs to members list and show alert
            setMembers(prev => Array.from(new Set([...prev, ...selectedIds])));
            Alert.alert('Đã mời', `${selectedIds.length} liên hệ đã được mời (mock)`);
          }}
        />

      </View>
    </SafeAreaView>
  );
}