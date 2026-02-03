import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Switch, ScrollView } from 'react-native';
import { useTheme } from '../../../context/themeContext';
import { Header } from '../../../components/Header';
import MuteOptionsSheet from '../../../components/MuteOptionsSheet';
import MuteSettingsModal from '../../../components/MuteSettingsModal';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

function Row({ icon, title, subtitle, rightNode, onPress, showChevron = false }: any) {
  const { scheme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} className={`${scheme === 'dark' ? 'border-b border-gray-800' : 'border-b border-gray-200'} px-4 py-4 flex-row items-center justify-between`}>
      <View className="flex-row items-center">
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: scheme === 'dark' ? '#111827' : '#F3F4F6' }}>
          <MaterialIcons name={icon as any} size={20} color={scheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
        </View>
        <View>
          <Text style={{ color: scheme === 'dark' ? '#fff' : '#111827', fontWeight: '600' }}>{title}</Text>
          {subtitle ? <Text style={{ color: scheme === 'dark' ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {rightNode}
        {showChevron && (
          <MaterialIcons name="chevron-right" size={22} color={scheme === 'dark' ? '#9CA3AF' : '#9CA3AF'} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ChatOptions() {
  const { scheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [pinned, setPinned] = useState(false);
  const [muteVisible, setMuteVisible] = useState(false);
  const [muteSettingsVisible, setMuteSettingsVisible] = useState(false);
  const [selectedMuteOption, setSelectedMuteOption] = useState<string>('Không tắt');
  const [excludeReminders, setExcludeReminders] = useState<boolean>(false);

  const isMuted = selectedMuteOption !== 'Không tắt';

  return (
    <SafeAreaView className={`${scheme === 'dark' ? 'flex-1 bg-background-dark' : 'flex-1 bg-background'}`}>
      <Header title="Tùy chọn" showBack onBackPress={() => router.back()} />

      <View className="items-center px-4 py-3 border-b" style={{ borderBottomColor: scheme === 'dark' ? '#111827' : '#F3F4F6' }}>
        <View className="w-24 h-24 rounded-full overflow-hidden mb-3">
          <Image source={{ uri: 'https://via.placeholder.com/96' }} style={{ width: 96, height: 96, borderRadius: 48 }} />
        </View>
        <Text style={{ color: scheme === 'dark' ? '#fff' : '#111827', fontSize: 20, fontWeight: '700' }}>{(params as any).id || 'Người dùng'}</Text>
      </View>

      <ScrollView>
        <View className="px-4 py-4 flex-row items-center justify-around">
          <TouchableOpacity className="items-center">
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: scheme === 'dark' ? '#111827' : '#fff', borderWidth: 1, borderColor: scheme === 'dark' ? '#1F2937' : '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 }}>
              <MaterialIcons name="search" size={20} color={scheme === 'dark' ? '#fff' : '#111827'} />
            </View>
            <Text style={{ color: scheme === 'dark' ? '#fff' : '#111827' }}>Tìm tin nhắn</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center" onPress={() => setMuteVisible(true)}>
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: isMuted ? '#2563EB' : (scheme === 'dark' ? '#111827' : '#fff'), borderWidth: 1, borderColor: isMuted ? '#1E40AF' : (scheme === 'dark' ? '#1F2937' : '#E5E7EB'), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 }}>
              <MaterialIcons name="notifications-off" size={20} color={isMuted ? '#fff' : (scheme === 'dark' ? '#fff' : '#111827')} />
            </View>
            <Text style={{ color: scheme === 'dark' ? '#fff' : '#111827' }}>{isMuted ? 'Đã tắt' : 'Tắt thông báo'}</Text>
          </TouchableOpacity> 
        </View>

        <View className="mt-4 border-t" style={{ borderTopColor: scheme === 'dark' ? '#111827' : '#F3F4F6' }}>
          <Row icon="edit" title="Đổi tên gợi nhớ" onPress={() => {}} />
        </View>

        <View className="mt-4 border-t" style={{ borderTopColor: scheme === 'dark' ? '#111827' : '#F3F4F6' }}>
          <Row
            icon="image"
            title="Ảnh, file, link"
            onPress={() => {}}
            rightNode={(
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', marginRight: 8 }}>
                  <Image source={{ uri: 'https://via.placeholder.com/80' }} style={{ width: 48, height: 48 }} />
                </View>
                <View style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', marginRight: 8 }}>
                  <Image source={{ uri: 'https://via.placeholder.com/80/eee' }} style={{ width: 48, height: 48 }} />
                </View>
                <View style={{ width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: scheme === 'dark' ? '#111827' : '#F3F4F6' }}>
                  <MaterialIcons name="arrow-forward" size={18} color={scheme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                </View>
              </View>
            )}
            showChevron
          />
          <Row icon="group-add" title="Tạo nhóm với người này" onPress={() => {}} />
          <Row icon="person-add" title="Thêm vào nhóm" onPress={() => {}} />
          <Row icon="people" title="Xem nhóm chung" subtitle="(1)" onPress={() => {}} />
        </View>

        <View className="mt-4 border-t" style={{ borderTopColor: scheme === 'dark' ? '#111827' : '#F3F4F6' }}>
          <Row icon="push-pin" title="Ghim trò chuyện" rightNode={<Switch value={pinned} onValueChange={setPinned} />} onPress={() => setPinned(v => !v)} />
          <Row icon="notifications" title="Báo cuộc gọi đến" rightNode={<Switch value={true} />} onPress={() => {}} />
        </View>

        <View className="mt-4 border-t px-4 py-6" style={{ borderTopColor: scheme === 'dark' ? '#111827' : '#F3F4F6' }}>
          <TouchableOpacity className="py-3" onPress={() => console.log('Manage block')}>
            <Text style={{ color: scheme === 'dark' ? '#fff' : '#111827' }}>Quản lý chặn</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3" onPress={() => console.log('Clear chat')}>
            <Text style={{ color: scheme === 'dark' ? '#fff' : '#111827' }}>Xóa lịch sử trò chuyện</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <MuteOptionsSheet
        visible={muteVisible}
        onClose={() => setMuteVisible(false)}
        onOpenSettings={() => { setMuteVisible(false); setMuteSettingsVisible(true); }}
        options={[ 'Bật thông báo', 'Trong 1 giờ', 'Trong 4 giờ', 'Đến 8 giờ sáng', 'Cho đến khi được mở lại' ]}
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
