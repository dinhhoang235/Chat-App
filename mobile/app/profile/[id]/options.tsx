import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/authContext';
import { ImagePickerModal, ProfileBioModal, MyQrModal, Header } from '@/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePickerLib from 'expo-image-picker';
import { uploadImage } from '@/services/imageUpload';
import { userAPI } from '@/services/user';
import { checkFriendshipStatus, sendFriendRequest, acceptFriendRequest, cancelFriendRequest, removeFriend, type User } from '@/services/friendship';

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
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);

  const isMeRoute = id === 'me';

  const loadProfile = useCallback(async () => {
    try {
      if (!profile) setLoading(true);
      const userId = isMeRoute && auth.user ? auth.user.id : parseInt(id);
      
      const promises: [Promise<any>, Promise<any> | null] = [
        userAPI.getUserById(userId),
        (auth.user && !isMeRoute) ? checkFriendshipStatus(userId) : null
      ];

      const [userData, statusData] = await Promise.all(promises);
      
      if (userData) {
        setProfile(userData);
      }

      if (statusData) {
        let mappedStatus = 'NONE';
        const s = statusData;
        
        if (s.status === 'request_received') {
          mappedStatus = 'PENDING_RECEIVED';
        } else if (s.status === 'request_sent') {
          // If the request was rejected, treat it as NONE so the user can send again
          mappedStatus = s.requestStatus === 'rejected' ? 'NONE' : 'PENDING_SENT';
        } else if (['friends', 'accepted', 'friend'].includes(s.status)) {
          mappedStatus = 'ACCEPTED';
        } else if (s.status) {
          mappedStatus = s.status.toUpperCase();
        }
        
        setFriendshipStatus(mappedStatus);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [id, auth.user, isMeRoute, profile]);

  useFocusEffect(
    useCallback(() => {
      if (isMeRoute && auth.user) {
        loadProfile();
      } else if (id && id !== 'me') {
        loadProfile();
      }
    }, [id, auth.user, isMeRoute, loadProfile])
  );

  // relationship state
  const isOwn = isMeRoute || (auth.user && profile?.phone && auth.user.phone && profile.phone === auth.user.phone);

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

  const handleSendFriendRequest = async () => {
    if (!profile?.id) return;
    try {
      await sendFriendRequest(profile.id);
      setFriendshipStatus('PENDING_SENT');
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profile?.id) return;
    try {
      await acceptFriendRequest(profile.id);
      setFriendshipStatus('ACCEPTED');
      Alert.alert('Thành công', 'Bạn bè đã được kết nối');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời. Vui lòng thử lại sau.');
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!profile?.id) return;
    try {
      await cancelFriendRequest(profile.id);
      setFriendshipStatus('NONE');
      Alert.alert('Thành công', 'Lời mời đã bị hủy');
    } catch (error) {
      console.error('Error canceling friend request:', error);
      Alert.alert('Lỗi', 'Không thể hủy lời mời. Vui lòng thử lại sau.');
    }
  };

  const handleRemoveFriend = async () => {
    if (!profile?.id) return;
    
    Alert.alert(
      'Xác nhận xóa bạn',
      `Bạn có chắc chắn muốn xóa ${profile.fullName} khỏi danh sách bạn bè?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await removeFriend(profile.id);
              setFriendshipStatus('NONE');
              Alert.alert('Thành công', 'Đã xóa bạn bè');
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Lỗi', 'Không thể xóa bạn bè. Vui lòng thử lại sau.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePick = async (action: 'take' | 'library' | 'zstyle' | 'choose-old') => {
    setImgPickerVisible(false);
    try {
      let result;
      
      if (action === 'take') {
        const permission = await ImagePickerLib.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Quyền truy cập', 'Cần cấp phép truy cập camera');
          return;
        }
        result = await ImagePickerLib.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: imgPickerType === 'avatar' ? [1, 1] : [16, 9],
          quality: 1, // raw quality - compression handled by compressImage
        });
      } else if (action === 'library') {
        const permission = await ImagePickerLib.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Quyền truy cập', 'Cần cấp phép truy cập thư viện ảnh');
          return;
        }
        result = await ImagePickerLib.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: imgPickerType === 'avatar' ? [1, 1] : [16, 9],
          quality: 1, // raw quality - compression handled by compressImage
        });
      }

      if (!result?.canceled && result?.assets?.[0]) {
        const imageUri = result.assets[0].uri;
        
        try {
          // Upload image
          const uploadResult = await uploadImage({ 
            imageUri, 
            type: imgPickerType, 
            userId: auth.user!.id 
          });
          
          Alert.alert('Thành công', `Cập nhật ${imgPickerType === 'avatar' ? 'ảnh đại diện' : 'ảnh bìa'} thành công`);
          
          // Update auth context with server-returned path
          if (auth.updateProfile && uploadResult.data) {
            const field = imgPickerType === 'avatar' ? 'avatar' : 'coverImage';
            auth.updateProfile({ [field]: uploadResult.data[field] });
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại.');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title={profile?.fullName || 'Người dùng'} showBack onBackPress={() => router.back()} />

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
        ) : friendshipStatus === 'ACCEPTED' ? (
          // friend
          <>
            <View >
              <Row icon="info" title="Thông tin" onPress={() => router.push(`/profile/${id}/info`)} />
              <Row icon="edit" title="Đổi tên gợi nhớ" onPress={() => Alert.alert('Đổi tên gợi nhớ', 'Demo')} />
            </View>

            <View className="mt-6 border-t" style={{ borderTopColor: colors.border }}>
              <Row icon="flag" title="Báo xấu" onPress={() => Alert.alert('Báo xấu', 'Gửi báo xấu demo')} />
              <TouchableOpacity 
                onPress={handleRemoveFriend} 
                className="px-4 py-4 flex-row items-center" 
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#FEE2E2' }}>
                  <MaterialIcons name="person-remove" size={20} color="#EF4444" />
                </View>
                <Text style={{ color: '#EF4444', fontWeight: '600' }}>Xóa bạn</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : friendshipStatus === 'PENDING_RECEIVED' ? (
          // received friend request - show accept button as "Kết bạn"
          <>
            <View>
              <Row icon="person-add" title="Kết bạn" onPress={handleAcceptFriendRequest} />
              <Row icon="info" title="Thông tin" onPress={() => router.push(`/profile/${id}/info`)} />
              <Row icon="edit" title="Đổi tên gợi nhớ" onPress={() => Alert.alert('Đổi tên gợi nhớ', 'Demo')} />
              <Row icon="flag" title="Báo xấu" onPress={() => Alert.alert('Báo xấu', 'Gửi báo xấu demo')} />
              <Row icon="block" title="Quản lý chặn" onPress={() => Alert.alert('Quản lý chặn', 'Demo')} />
            </View>
          </>
        ) : friendshipStatus === 'PENDING_SENT' ? (
          // sent friend request
          <>
            <View>
              <Row 
                icon="person-add" 
                title="Đã gửi lời mời kết bạn" 
                onPress={handleCancelFriendRequest}
              />
              <Row icon="info" title="Thông tin" onPress={() => router.push(`/profile/${id}/info`)} />
              <Row icon="edit" title="Đổi tên gợi nhớ" onPress={() => Alert.alert('Đổi tên gợi nhớ', 'Demo')} />
              <Row icon="flag" title="Báo xấu" onPress={() => Alert.alert('Báo xấu', 'Gửi báo xấu demo')} />
              <Row icon="block" title="Quản lý chặn" onPress={() => Alert.alert('Quản lý chặn', 'Demo')} />
            </View>
          </>
        ) : (
          // stranger (NONE)
          <>
            <View>
              <Row icon="person-add" title="Kết bạn" onPress={handleSendFriendRequest} />
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

      <MyQrModal 
        visible={qrVisible} 
        onClose={() => setQrVisible(false)} 
        name={auth.user?.fullName} 
        phone={auth.user?.phone} 
        avatarUri={auth.user?.avatar} 
        data={`chatapp://profile/${auth.user?.id}`} 
      />

    </SafeAreaView>
  );
}
