import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Switch, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../../context/themeContext';
import { useSearch } from '../../../context/searchContext';
import { Header } from '../../../components/Header';
import MuteOptionsSheet from '../../../components/MuteOptionsSheet';
import MuteSettingsModal from '../../../components/MuteSettingsModal';
import AddToGroupModal from '../../../components/AddToGroupModal';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { contacts } from '../../../constants/mockData';
import { useAuth } from '../../../context/authContext';

function Row({ icon, title, subtitle, rightNode, onPress, showChevron = false, titleColor }: any) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} className="px-4 py-4 flex-row items-center justify-between" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View className="flex-row items-center">
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surfaceVariant }}>
          <MaterialIcons name={icon as any} size={20} color={colors.textSecondary} />
        </View>
        <View>
          <Text style={{ color: titleColor ?? colors.text, fontWeight: '600' }}>{title}</Text>
          {subtitle ? <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {rightNode}
        {showChevron && (
          <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

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
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{name}</Text>
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
                showChevron
              />
              <Row icon="push-pin" title="Tin nhắn đã ghim" onPress={() => { }} />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="people" title={`Xem thành viên`} subtitle={`(${contact?.membersCount ?? 0})`} onPress={() => router.push(`/chat/${id}/members`)} showChevron />

              <Row icon="link" title="Link nhóm" subtitle="https://zalo.me/g/wftfeh870" onPress={() => console.log('Open group link')} showChevron />

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
              <Row icon="flag" title="Báo xấu" onPress={() => console.log('Report group')} />
              <Row icon="delete" title="Xóa lịch sử trò chuyện" onPress={() => console.log('Clear chat')} />
              <Row icon="exit-to-app" title="Rời nhóm" onPress={() => console.log('Leave group')} titleColor={colors.danger} />
            </View>
          </>
        ) : (
          <>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="edit" title="Đổi tên gợi nhớ" onPress={() => { }} />
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
                showChevron
              />
              <Row icon="group-add" title="Tạo nhóm với người này" onPress={() => { }} />
              <Row icon="person-add" title="Thêm vào nhóm" onPress={() => { }} />
              <Row icon="people" title="Xem nhóm chung" subtitle="(1)" onPress={() => { }} />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="push-pin" title="Ghim trò chuyện" rightNode={<Switch value={pinned} onValueChange={setPinned} />} onPress={() => setPinned(v => !v)} />
              <Row icon="notifications" title="Báo cuộc gọi đến" rightNode={<Switch value={true} />} onPress={() => { }} />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="flag" title="Báo xấu" onPress={() => console.log('Report group')} />
              <Row icon="block" title="Quản lý chặn" onPress={() => console.log('Manage block')} />
              <Row icon="delete" title="Xóa lịch sử trò chuyện" onPress={() => console.log('Clear chat')} />
            </View>
          </>
        )}
      </ScrollView>

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

    </SafeAreaView>
  );
}
