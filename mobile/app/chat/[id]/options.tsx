import React from 'react';
import { ScrollView, Switch, Alert, View, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/themeContext';
import { useSearch } from '@/context/searchContext';
import { Header, MuteOptionsSheet, MuteSettingsModal, BlockSettingsModal, EditDisplayNameModal, AddToGroupModal, ChatOptionRow, ReportModal, ConfirmModal, LeaveGroupSheet, ChatOptionsHeaderInfo, QuickActions } from '@/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatOptions } from '@/hooks/useChatOptions';
import { MaterialIcons } from '@expo/vector-icons';


const Row = ChatOptionRow;

export default function ChatOptions() {
  const { colors } = useTheme();
  const { open } = useSearch();

  const {
    router,
    id,
    name,
    avatar,
    isGroup,
    membersCount,
    groupAvatars,
    isOnline,
    groupDetails,
    pinned, setPinned,
    eyeOff, setEyeOff,
    muteVisible, setMuteVisible,
    muteSettingsVisible, setMuteSettingsVisible,
    selectedMuteOption, setSelectedMuteOption,
    excludeReminders, setExcludeReminders,
    addModalVisible, setAddModalVisible,
    blockVisible, setBlockVisible,
    blockMessages, setBlockMessages,
    blockCalls, setBlockCalls,
    displayNameModalVisible, setDisplayNameModalVisible,
    displayName, setDisplayName,
    reportVisible, setReportVisible,
    confirmVisible, setConfirmVisible,
    leaveVisible, setLeaveVisible,
    isMuted,
    performClearChat,
    performLeaveGroup,
    isOwner,
    fetchGroupDetails,
    recentImages,
  } = useChatOptions();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Tùy chọn" showBack onBackPress={() => router.back()} />

      <ScrollView>
        <ChatOptionsHeaderInfo
          isGroup={isGroup}
          groupAvatars={groupAvatars}
          membersCount={groupDetails?.participants?.length || membersCount}
          avatar={avatar}
          isOnline={isOnline}
          name={name}
          displayName={displayName}
          colors={colors}
        />

        <QuickActions
          conversationId={id}
          isGroup={isGroup}
          isMuted={isMuted}
          onSearch={() => { open(id); router.back(); }}
          onToggleMute={() => setMuteVisible(true)}
          onMemberAdded={fetchGroupDetails}
          colors={colors}
        />

        {isGroup ? (
          <>
            <View className="mt-4">
              <Row
                icon="image"
                title="Ảnh, file, link"
                onPress={() => router.push(`/chat/${id}/media`)}
                showChevron
                bottomBorder={recentImages.length === 0}
              />
              {recentImages.length > 0 && (
                <View style={{ flexDirection: 'row', paddingLeft: 60, paddingVertical: 4 }}>
                  {recentImages.slice(0, 4).map((uri: string, idx: number) => (
                    <TouchableOpacity key={idx} onPress={() => router.push(`/chat/${id}/media`)} style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', marginRight: 4 }}>
                      <Image source={{ uri }} style={{ width: 62, height: 62 }} />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => router.push(`/chat/${id}/media`)}
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.surfaceVariant,
                    }}
                  >
                    <MaterialIcons name="arrow-forward" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View className="border-t" style={{ borderTopColor: colors.border, marginTop: 4 }}>
              <Row icon="push-pin" title="Tin nhắn đã ghim" onPress={() => router.push(`/chat/${id}/pinned`)} showChevron />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row 
                icon="people" 
                title={`Xem thành viên`} 
                subtitle={`(${groupDetails?.participants?.length || membersCount})`} 
                onPress={() => router.push(`/chat/${id}/members`)} 
                showChevron 
              />

              <Row icon="link" title="Link nhóm" subtitle="https://zalo.me/g/wftfeh870" onPress={() => router.push(`/chat/${id}/link`)} showChevron />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              {isOwner ? (
                <>
                  <Row icon="settings" title="Cài đặt nhóm" onPress={() => router.push(`/chat/${id}/settings`)} showChevron />
                  <Row icon="how-to-reg" title="Phê duyệt thành viên" subtitle={`(${groupDetails?.pendingMembers?.length ?? 0})`} onPress={() => router.push(`/chat/${id}/members?mode=pending`)} showChevron />
                </>
              ) : null}
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="push-pin" title="Ghim trò chuyện" rightNode={<Switch value={pinned} onValueChange={setPinned} />} onPress={() => setPinned(v => !v)} />
              <Row icon="visibility-off" title="Ẩn trò chuyện" rightNode={<Switch value={eyeOff} onValueChange={setEyeOff} />} onPress={() => setEyeOff(v => !v)} />
            </View>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="flag" title="Báo xấu" onPress={() => setReportVisible(true)} />
              <Row icon="delete" title="Xóa lịch sử trò chuyện" onPress={() => setConfirmVisible(true)} titleColor={colors.danger} iconColor={colors.danger} />
              <Row icon="exit-to-app" title="Rời nhóm" onPress={() => setLeaveVisible(true)} titleColor={colors.danger} iconColor={colors.danger} />
            </View>
          </>
        ) : (
          <>
            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="edit" title="Đổi tên gợi nhớ" subtitle={displayName ? displayName : 'Chưa đặt'} onPress={() => setDisplayNameModalVisible(true)} />
            </View>

            <View className="mt-4">
              <Row
                icon="image"
                title="Ảnh, file, link"
                onPress={() => router.push(`/chat/${id}/media`)}
                showChevron
                bottomBorder={recentImages.length === 0}
              />
              {recentImages.length > 0 && (
                <View style={{ flexDirection: 'row', paddingLeft: 60, paddingVertical: 4 }}>
                  {recentImages.slice(0, 4).map((uri: string, idx: number) => (
                    <TouchableOpacity key={idx} onPress={() => router.push(`/chat/${id}/media`)} style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', marginRight: 4 }}>
                      <Image source={{ uri }} style={{ width: 62, height: 62 }} />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => router.push(`/chat/${id}/media`)}
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.surfaceVariant,
                    }}
                  >
                    <MaterialIcons name="arrow-forward" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View className="border-t" style={{ borderTopColor: colors.border, marginTop: 4 }}>
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
              <Row icon="delete" title="Xóa lịch sử trò chuyện" onPress={() => setConfirmVisible(true)} titleColor={colors.danger} iconColor={colors.danger} />
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
        onLeave={() => performLeaveGroup()}
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
