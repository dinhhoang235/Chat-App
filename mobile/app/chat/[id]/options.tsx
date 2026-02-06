import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Switch, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../../context/themeContext';
import { useSearch } from '../../../context/searchContext';
import { Header } from '../../../components/Header';
import MuteOptionsSheet from '../../../components/MuteOptionsSheet';
import MuteSettingsModal from '../../../components/MuteSettingsModal';
import BlockSettingsModal from '../../../components/BlockSettingsModal';
import EditDisplayNameModal from '../../../components/EditDisplayNameModal';
import AddToGroupModal from '../../../components/AddToGroupModal';
import ChatOptionRow from '../../../components/ChatOptionRow';
import ReportModal from '../../../components/ReportModal';
import ConfirmModal from '../../../components/ConfirmModal';
import LeaveGroupSheet from '../../../components/LeaveGroupSheet';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { contacts } from '../../../constants/mockData';
import { useAuth } from '../../../context/authContext';

const Row = ChatOptionRow;

export default function ChatOptions() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { open } = useSearch();
  const [pinned, setPinned] = useState(false);
  const [eyeOff, setEyeOff] = useState(false);
  const [muteVisible, setMuteVisible] = useState(false);
  const [muteSettingsVisible, setMuteSettingsVisible] = useState(false);
  const [selectedMuteOption, setSelectedMuteOption] = useState<string>('Không tắt');
  const [excludeReminders, setExcludeReminders] = useState<boolean>(false);
  const [addModalVisible, setAddModalVisible] = useState(false);

  // block settings
  const [blockVisible, setBlockVisible] = useState(false);
  const [blockMessages, setBlockMessages] = useState<boolean>(false);
  const [blockCalls, setBlockCalls] = useState<boolean>(false);

  // edit display name
  const [displayNameModalVisible, setDisplayNameModalVisible] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);

  // report modal state
  const [reportVisible, setReportVisible] = useState(false);
  // confirm clear chat modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  // leave group modal
  const [leaveVisible, setLeaveVisible] = useState(false);

  // resolve id / contact so we can detect groups reliably
  const id = (params as any).id as string;
  const contact = contacts.find(c => c.id === id);
  const name = contact?.name ?? (params as any).id ?? 'Người dùng';
  const avatar = (params as any).avatar as string | undefined;
  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isMuted = selectedMuteOption !== 'Không tắt';

  const confirmClearChat = () => {
    setConfirmVisible(true);
  };

  const performClearChat = () => {
    setConfirmVisible(false);
    Alert.alert('Đã xóa', 'Lịch sử trò chuyện đã được xóa (mock)');
  };

  const performLeaveGroup = () => {
    setLeaveVisible(false);
    // TODO: call API to leave group
    Alert.alert('Đã rời nhóm', 'Bạn đã rời nhóm (mock)');
  };
  const { user } = useAuth();
  const isOwner = !!contact?.ownerPhone && user?.phone === contact?.ownerPhone;

  // determine if this chat is a group (explicit flag wins)
  const isGroup = !!contact?.isGroup || (params as any).isGroup === '1' || (params as any).group === '1' ||
    ((name || '').toLowerCase().includes('nhóm') || (name || '').toLowerCase().includes('team'));
  // Note: callers can explicitly opt-in by passing `?isGroup=1` or `?group=1` in the route


  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Tùy chọn" showBack onBackPress={() => router.back()} />

      <ScrollView>
        <View className="items-center px-4 py-3" >
          <View className="w-24 h-24 rounded-full overflow-hidden mb-3 items-center justify-center" style={{ backgroundColor: colors.surfaceVariant }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 96, height: 96, borderRadius: 48 }} resizeMode="cover" />
            ) : (
              <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
                <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>{getInitials(name)}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{displayName ?? name}</Text>
        </View>

        <View className="px-4 py-4 flex-row items-center justify-around">
          {isGroup ? (
            <>
              <TouchableOpacity className="items-center" onPress={() => { const id = (params as any).id; open(id); router.back(); }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <MaterialIcons name="search" size={20} color={colors.text} />
                </View>
                <Text style={{ color: colors.text }}>Tìm tin nhắn</Text>
              </TouchableOpacity>

              <TouchableOpacity className="items-center" onPress={() => setAddModalVisible(true)}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <MaterialIcons name="person-add" size={20} color={colors.text} />
                </View>
                <Text style={{ color: colors.text }}>Thêm thành viên</Text>
              </TouchableOpacity>

              <TouchableOpacity className="items-center" onPress={() => setMuteVisible(true)}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: isMuted ? colors.tint : colors.surface, borderWidth: 1, borderColor: isMuted ? colors.tint : colors.border }}>
                  <MaterialIcons name="notifications-off" size={20} color={isMuted ? '#fff' : colors.text} />
                </View>
                <Text style={{ color: colors.text }}>{isMuted ? 'Đã tắt' : 'Tắt thông báo'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity className="items-center" onPress={() => { const id = (params as any).id; open(id); router.back(); }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <MaterialIcons name="search" size={20} color={colors.text} />
                </View>
                <Text style={{ color: colors.text }}>Tìm tin nhắn</Text>
              </TouchableOpacity>

              <TouchableOpacity className="items-center" onPress={() => setMuteVisible(true)}>
                <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: isMuted ? colors.tint : colors.surface, borderWidth: 1, borderColor: isMuted ? colors.tint : colors.border }}>
                  <MaterialIcons name="notifications-off" size={20} color={isMuted ? '#fff' : colors.text} />
                </View>
                <Text style={{ color: colors.text }}>{isMuted ? 'Đã tắt' : 'Tắt thông báo'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {isGroup ? (
          <>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row
                icon="image"
                title="Ảnh, file, link"
                onPress={() => { }}
                rightNode={(
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', marginRight: 8 }}>
                      <Image source={{ uri: 'https://via.placeholder.com/80' }} style={{ width: 48, height: 48 }} />
                    </View>
                    <View style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', marginRight: 8 }}>
                      <Image source={{ uri: 'https://via.placeholder.com/80/eee' }} style={{ width: 48, height: 48 }} />
                    </View>
                    <View style={{ width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVariant }}>
                      <MaterialIcons name="arrow-forward" size={18} color={colors.textSecondary} />
                    </View>
                  </View>
                )}
              />
              <Row icon="push-pin" title="Tin nhắn đã ghim" onPress={() => router.push(`/chat/${id}/pinned`)} showChevron />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="people" title={`Xem thành viên`} subtitle={`(${contact?.membersCount ?? 0})`} onPress={() => router.push(`/chat/${id}/members`)} showChevron />

              <Row icon="link" title="Link nhóm" subtitle="https://zalo.me/g/wftfeh870" onPress={() => router.push(`/chat/${id}/link`)} showChevron />

              {isOwner ? (
                <>
                  <Row icon="settings" title="Cài đặt nhóm" onPress={() => router.push(`/chat/${id}/settings`)} showChevron />
                  <Row icon="how-to-reg" title="Phê duyệt thành viên" subtitle={`(${contact?.pendingMembers?.length ?? 0})`} onPress={() => router.push(`/chat/${id}/members?mode=pending`)} showChevron />
                </>
              ) : null}
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="push-pin" title="Ghim trò chuyện" rightNode={<Switch value={pinned} onValueChange={setPinned} />} onPress={() => setPinned(v => !v)} />
              <Row icon="visibility-off" title="Ẩn trò chuyện" rightNode={<Switch value={eyeOff} onValueChange={setEyeOff} />} onPress={() => setEyeOff(v => !v)} />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="flag" title="Báo xấu" onPress={() => setReportVisible(true)} />
              <Row icon="delete" title="Xóa lịch sử trò chuyện" onPress={() => confirmClearChat()} />
              <Row icon="exit-to-app" title="Rời nhóm" onPress={() => setLeaveVisible(true)} titleColor={colors.danger} />
            </View>
          </>
        ) : (
          <>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="edit" title="Đổi tên gợi nhớ" subtitle={displayName ? displayName : 'Chưa đặt'} onPress={() => setDisplayNameModalVisible(true)} />
            </View>

            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row
                icon="image"
                title="Ảnh, file, link"
                onPress={() => { }}
                rightNode={(
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', marginRight: 8 }}>
                      <Image source={{ uri: 'https://via.placeholder.com/80' }} style={{ width: 48, height: 48 }} />
                    </View>
                    <View style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', marginRight: 8 }}>
                      <Image source={{ uri: 'https://via.placeholder.com/80/eee' }} style={{ width: 48, height: 48 }} />
                    </View>
                    <View style={{ width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVariant }}>
                      <MaterialIcons name="arrow-forward" size={18} color={colors.textSecondary} />
                    </View>
                  </View>
                )}
                
              />
              <Row icon="people" title="Xem nhóm chung" subtitle="(1)" onPress={() => { }} />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="push-pin" title="Ghim trò chuyện" rightNode={<Switch value={pinned} onValueChange={setPinned} />} onPress={() => setPinned(v => !v)} />
              <Row icon="notifications" title="Báo cuộc gọi đến" rightNode={<Switch value={true} />} onPress={() => { }} />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="flag" title="Báo xấu" onPress={() => setReportVisible(true)} />
              <Row
                icon="block"
                title="Quản lý chặn"
                subtitle={blockMessages && blockCalls ? 'Chặn tin nhắn, cuộc gọi' : blockMessages ? 'Chặn tin nhắn' : blockCalls ? 'Chặn cuộc gọi' : 'Không chặn'}
                onPress={() => setBlockVisible(true)}
              />
              <Row icon="delete" title="Xóa lịch sử trò chuyện" onPress={() => confirmClearChat()} />
            </View>
          </>
        )}
      </ScrollView>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onReport={(reason) => { setReportVisible(false); Alert.alert('Đã báo', `Lý do: ${reason}`); }}
      />

      <ConfirmModal
        visible={confirmVisible}
        title="Xóa lịch sử trò chuyện"
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => performClearChat()}
        confirmText="Xóa"
      />

      <LeaveGroupSheet
        visible={leaveVisible}
        onClose={() => setLeaveVisible(false)}
        onLeave={() => { setLeaveVisible(false); performLeaveGroup(); }}
      />

      <AddToGroupModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={(selectedIds) => {
          setAddModalVisible(false);
          Alert.alert('Đã mời', `${selectedIds.length} liên hệ đã được mời (mock)`);
        }}
      />

      <MuteOptionsSheet
        visible={muteVisible}
        onClose={() => setMuteVisible(false)}
        onOpenSettings={() => { setMuteVisible(false); setMuteSettingsVisible(true); }}
        options={['Bật thông báo', 'Trong 1 giờ', 'Trong 4 giờ', 'Đến 8 giờ sáng', 'Cho đến khi được mở lại']}
        onSelect={(opt) => {
          if (opt === 'Bật thông báo') {
            setSelectedMuteOption('Không tắt');
            setExcludeReminders(false);
          } else {
            setSelectedMuteOption(opt);
          }
        }}
      />

      <MuteSettingsModal
        visible={muteSettingsVisible}
        onClose={() => setMuteSettingsVisible(false)}
        initialOption={selectedMuteOption !== 'Không tắt' ? selectedMuteOption : 'Trong 1 giờ'}
        initialExclude={excludeReminders}
        onSave={(opt, exclude) => { setSelectedMuteOption(opt); setExcludeReminders(exclude); setMuteSettingsVisible(false); }}
      />

      <BlockSettingsModal
        visible={blockVisible}
        onClose={() => setBlockVisible(false)}
        initialBlockMessages={blockMessages}
        initialBlockCalls={blockCalls}
        onSave={(bm, bc) => { setBlockMessages(bm); setBlockCalls(bc); }}
      />

      <EditDisplayNameModal
        visible={displayNameModalVisible}
        onClose={() => setDisplayNameModalVisible(false)}
        initialName={displayName ?? name}
        onSave={(newName) => {
          setDisplayName(newName || undefined);
        }}
      />

    </SafeAreaView>
  );
}
