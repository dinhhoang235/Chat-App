import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../../context/authContext';
import ImagePickerModal from '../../../components/ImagePickerModal';
import ProfileBioModal from '../../../components/ProfileBioModal';
import MyQrModal from '../../../components/MyQrModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/themeContext';
import { Header } from '../../../components/Header';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { contacts } from '../../../constants/mockData';

function Row({ icon, title, subtitle, onPress, rightNode, showChevron = true }: any) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} className="px-4 py-4 flex-row items-center justify-between" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View className="flex-row items-center">
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.surfaceVariant }}>
          <MaterialIcons name={icon as any} size={20} color={colors.textSecondary} />
        </View>
        <View>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{title}</Text>
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

export default function ProfileOptions() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const auth = useAuth();
  const id = (params as any).id as string;
  const profile = contacts.find((c) => c.id === id) || { name: 'Người dùng', initials: (id || 'U').slice(0,2).toUpperCase() } as any;

  // relationship state
  const isMeRoute = id === 'me';
  const isOwn = isMeRoute || (auth.user && profile?.phone && auth.user.phone && profile.phone === auth.user.phone);
  const isFriend = !!profile && !isOwn && profile.id !== 'me';

  const [imgPickerVisible, setImgPickerVisible] = React.useState(false);
  const [imgPickerType, setImgPickerType] = React.useState<'avatar' | 'cover'>('avatar');

  // bio modal
  const [bioVisible, setBioVisible] = React.useState(false);
  // qr modal
  const [qrVisible, setQrVisible] = React.useState(false);

  const openImgPicker = (type: 'avatar' | 'cover') => {
    setImgPickerType(type);
    setImgPickerVisible(true);
  };

  const handlePick = (action: 'take' | 'library' | 'zstyle' | 'choose-old') => {
    setImgPickerVisible(false);
    // demo: replace with real flow (ImagePicker or upload)
    Alert.alert('Chọn ảnh', `Loại: ${imgPickerType}, hành động: ${action}`);
  };
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title={profile.name} showBack onBackPress={() => router.back()} />

      <ScrollView>
        {isOwn ? (
          // own profile
          <>
            <View>
              <Row icon="info" title="Thông tin" onPress={() => router.push(`/profile/${id}/info`)} />
              <Row icon="photo-camera" title="Đổi ảnh đại diện" onPress={() => openImgPicker('avatar')} />
              <Row icon="photo" title="Đổi ảnh bìa" onPress={() => openImgPicker('cover')} />
              <Row icon="edit" title="Cập nhật giới thiệu bản thân" onPress={() => setBioVisible(true)} />
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>Cài đặt</Text>
            </View>

            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="qr-code" title="Mã QR của tôi" onPress={() => setQrVisible(true)} />
              <Row icon="shield" title="Quyền riêng tư" onPress={() => router.push('/settings/privacy')} />
              <Row icon="manage-accounts" title="Quản lý tài khoản" onPress={() => router.push('/settings/account')} />
              <Row icon="settings" title="Cài đặt chung" onPress={() => router.push('/settings')} />
            </View>
          </>
        ) : isFriend ? (
          // friend
          <>
            <View >
              <Row icon="info" title="Thông tin" onPress={() => router.push(`/profile/${id}/info`)} />
              <Row icon="edit" title="Đổi tên gợi nhớ" onPress={() => Alert.alert('Đổi tên gợi nhớ', 'Demo')} />
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>Cài đặt riêng tư</Text>
            </View>

            <View className="mt-6 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="flag" title="Báo xấu" onPress={() => Alert.alert('Báo xấu', 'Gửi báo xấu demo')} />
              {!isOwn && (
                <TouchableOpacity className="py-4" onPress={() => Alert.alert('Xóa bạn', 'Bạn sẽ xóa bạn này (demo)')}>
                  <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: '700' }}>Xóa bạn</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          // stranger
          <>
            <View style={{ padding: 16 }}>
              <TouchableOpacity style={{ backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 22, alignItems: 'center', marginBottom: 12 }} onPress={() => Alert.alert('Kết bạn', 'Yêu cầu kết bạn đã gửi (demo)')}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Kết bạn</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-4 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="info" title="Thông tin" onPress={() => router.push(`/profile/${id}/info`)} />
              <Row icon="edit" title="Đổi tên gợi nhớ" onPress={() => Alert.alert('Đổi tên gợi nhớ', 'Demo')} />
              <Row icon="flag" title="Báo xấu" onPress={() => Alert.alert('Báo xấu', 'Gửi báo xấu demo')} />
              <Row icon="block" title="Quản lý chặn" onPress={() => Alert.alert('Quản lý chặn', 'Demo')} />
            </View>
          </>
        )}
      </ScrollView>

      <ImagePickerModal visible={imgPickerVisible} onClose={() => setImgPickerVisible(false)} type={imgPickerType} onPick={handlePick} />

      <ProfileBioModal
        visible={bioVisible}
        onClose={() => setBioVisible(false)}
        initialValue={auth.user?.bio ?? ''}
        onSave={(bio) => {
          auth.updateProfile?.({ bio });
          Alert.alert('Lưu', 'Lưu lời giới thiệu thành công');
        }}
      />

      <MyQrModal visible={qrVisible} onClose={() => setQrVisible(false)} name={auth.user?.fullName} phone={auth.user?.phone} avatarUri={undefined} data={auth.user?.phone ?? 'chatapp'} />

    </SafeAreaView>
  );
}
