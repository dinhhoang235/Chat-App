import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Alert, Image, Modal, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { Header, ProfileBioModal } from '@/components';
import { MaterialIcons } from '@expo/vector-icons';
import { userAPI } from '@/services/user';
import { checkFriendshipStatus, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, User } from '@/services/friendship';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// Constants
const AVATAR_SIZE = 92;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const AVATAR_IMAGE_SIZE = 86;
const AVATAR_IMAGE_RADIUS = AVATAR_IMAGE_SIZE / 2;
const COVER_IMAGE_HEIGHT = 220;
const HEADER_HEIGHT = 56;
const HEADER_ELEVATION = 6;

export default function UserProfile() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const id = (params as any).id as string;
  const [bioVisible, setBioVisible] = React.useState(false);
  const [imageViewerUri, setImageViewerUri] = React.useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<string>('NONE');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Support special 'me' route which shows the logged-in user's profile
  const isMeRoute = id === 'me';

  // Helper functions
  const getAvatarUrl = useCallback((avatarPath?: string) => {
    return avatarPath ? `${API_BASE_URL}${avatarPath}` : null;
  }, []);

  const getCoverUrl = useCallback((coverPath?: string) => {
    return coverPath ? `${API_BASE_URL}${coverPath}` : null;
  }, []);

  const calculateInitials = useCallback((fullName?: string, fallbackId?: string) => {
    if (fullName) {
      return fullName
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return fallbackId ? fallbackId.slice(-2).toUpperCase() : 'U';
  }, []);

  // Memoized values
  const initials = useMemo(
    () => profile?.fullName ? calculateInitials(profile.fullName) : calculateInitials(undefined, id),
    [profile?.fullName, id, calculateInitials]
  );

  const avatarUrl = useMemo(() => getAvatarUrl(profile?.avatar), [profile?.avatar, getAvatarUrl]);
  const coverUrl = useMemo(() => getCoverUrl(profile?.coverImage), [profile?.coverImage, getCoverUrl]);

  // If not found and id looks like a phone number, treat as stranger with phone as id
  const isPhoneLike = /^\d+$/.test(id || '');

  const loadUserProfile = useCallback(async () => {
    try {
      // Only show main loader if we don't have profile data yet (first load)
      if (!profile) setLoading(true);
      
      const userId = isMeRoute && user ? user.id : parseInt(id);
      
      // Load user profile and friendship status in parallel for better performance
      const promises: [Promise<any>, Promise<any> | null] = [
        userAPI.getUserById(userId).catch(() => {
          if (isPhoneLike) return { id: userId.toString(), fullName: 'Người dùng ' + id };
          return null;
        }),
        (user && !isMeRoute) ? checkFriendshipStatus(userId) : null
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
      if (!profile) Alert.alert('Lỗi', 'Không thể tải thông tin người dùng');
    } finally {
      setLoading(false);
    }
  }, [id, user, isMeRoute, isPhoneLike, profile]);

  useFocusEffect(
    useCallback(() => {
      if (isMeRoute && user) {
        loadUserProfile();
      } else if (id && id !== 'me') {
        loadUserProfile();
      }
    }, [id, user, isMeRoute, loadUserProfile])
  );

  // Separate effect to refresh friendship status on focus
  useFocusEffect(
    useCallback(() => {
      const refreshFriendshipStatus = async () => {
        if (!user || isMeRoute) return;
        
        try {
          const userId = parseInt(id);
          const statusData = await checkFriendshipStatus(userId);
          
          if (statusData) {
            let mappedStatus = 'NONE';
            const s = statusData;
            
            if (s.status === 'request_received') {
              mappedStatus = 'PENDING_RECEIVED';
            } else if (s.status === 'request_sent') {
              mappedStatus = s.requestStatus === 'rejected' ? 'NONE' : 'PENDING_SENT';
            } else if (['friends', 'accepted', 'friend'].includes(s.status)) {
              mappedStatus = 'ACCEPTED';
            } else if (s.status) {
              mappedStatus = s.status.toUpperCase();
            }
            
            setFriendshipStatus(mappedStatus);
          }
        } catch (error) {
          console.error('Error refreshing friendship status:', error);
        }
      };
      
      refreshFriendshipStatus();
    }, [id, user, isMeRoute])
  );

  const handleSendFriendRequest = async () => {
    if (!profile?.id) return;
    
    const previousStatus = friendshipStatus;
    try {
      setFriendshipStatus('PENDING_SENT'); // Optimistic update
      setSendingRequest(true);
      await sendFriendRequest(Number(profile.id));
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
    } catch (error) {
      setFriendshipStatus(previousStatus); // Rollback
      console.error('Error sending friend request:', error);
      Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn. Vui lòng thử lại sau.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!profile?.id) return;
    
    const previousStatus = friendshipStatus;
    try {
      setFriendshipStatus('NONE'); // Optimistic update
      setSendingRequest(true);
      await cancelFriendRequest(Number(profile.id));
      Alert.alert('Thành công', ' Đã hủy yêu cầu kết bạn');
    } catch (error) {
      setFriendshipStatus(previousStatus); // Rollback
      console.error('Error canceling friend request:', error);
      Alert.alert('Lỗi', 'Không thể hủy yêu cầu kết bạn. Vui lòng thử lại sau.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profile?.id) return;
    
    const previousStatus = friendshipStatus;
    try {
      setFriendshipStatus('ACCEPTED'); // Optimistic update
      setSendingRequest(true);
      await acceptFriendRequest(Number(profile.id));
      Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');
    } catch (error) {
      setFriendshipStatus(previousStatus); // Rollback
      console.error('Error accepting friend request:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời. Vui lòng thử lại sau.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!profile?.id) return;
    
    const previousStatus = friendshipStatus;
    try {
      setFriendshipStatus('NONE'); // Optimistic update
      setSendingRequest(true);
      await rejectFriendRequest(Number(profile.id));
      Alert.alert('Thành công', 'Đã từ chối lời mời kết bạn');
    } catch (error) {
      setFriendshipStatus(previousStatus); // Rollback
      console.error('Error rejecting friend request:', error);
      Alert.alert('Lỗi', 'Không thể từ chối lời mời. Vui lòng thử lại sau.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleMessagePress = useCallback(async () => {
    if (!profile?.id) return;
    
    // Simply navigate to /chat/new with target user info
    // This matches the logic in StartChatModal.tsx
    // The conversation will only be created on the first message sent in ChatThread
    router.push({
      pathname: '/chat/new',
      params: { 
        targetUserId: profile.id.toString(),
        name: profile.fullName,
        avatar: profile.avatar || ''
      }
    });
  }, [profile, router]);

  const isStranger = !profile && isPhoneLike;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => {
          if (coverUrl) {
            setImageViewerUri(coverUrl);
          }
        }}>
          <ImageBackground
            source={coverUrl ? { uri: coverUrl } : undefined}
            style={{ height: COVER_IMAGE_HEIGHT, backgroundColor: '#2563EB' }}
          />
        </TouchableOpacity>

        <Header
          transparent
          overlay
          showBack
          onBackPress={() => router.back()}
          addIconName="more-horiz"
          onAddPress={() => router.push(`/profile/${id}/options`)}
        />

        {/* Spacer to reserve header height so content isn't hidden under absolute header */}
        <View style={{ height: HEADER_HEIGHT + insets.top }} />

        {/* Avatar + name (raise avatar above cover) */}
        <View style={{ alignItems: 'center', marginTop: -120 - insets.top }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => avatarUrl && setImageViewerUri(avatarUrl)}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_RADIUS, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: HEADER_ELEVATION }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: AVATAR_IMAGE_SIZE, height: AVATAR_IMAGE_SIZE, borderRadius: AVATAR_IMAGE_RADIUS }}
              />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 26 }}>{initials}</Text>
            )}

            {/* small online dot */}
            {profile?.online ? (
              <View style={{ position: 'absolute', right: -6, top: 8, backgroundColor: '#10B981', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.background }} />
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{profile?.fullName ?? (isStranger ? 'Người dùng' : 'Không xác định')}</Text>
          </View>

          {/* Bio: show under phone number (me or profile) */}
          {isMeRoute ? (
            <TouchableOpacity onPress={() => setBioVisible(true)}>
              {user?.bio ? (
                <Text style={{ color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>{user.bio}</Text>
              ) : (
                <Text style={{ color: colors.tint, marginTop: 6, textAlign: 'center', fontWeight: '500' }}>Cập nhật giới thiệu bản thân</Text>
              )}
            </TouchableOpacity>
          ) : profile?.bio ? (
            <Text style={{ color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>{profile.bio}</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={{ padding: 12 }}>
          {isMeRoute ? null : friendshipStatus === 'ACCEPTED' ? (
            <View style={{ alignItems: 'center', marginBottom: 6 }}>
              <TouchableOpacity style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 22 }} onPress={handleMessagePress}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          ) : friendshipStatus === 'NONE' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <TouchableOpacity 
                style={{ backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 22, flex: 1, alignItems: 'center' }} 
                onPress={handleMessagePress}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Nhắn tin</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                disabled={sendingRequest}
                onPress={handleSendFriendRequest}
                style={{ backgroundColor: sendingRequest ? '#9CA3AF' : colors.surfaceVariant, paddingVertical: 12, borderRadius: 22, flex: 1, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{sendingRequest ? 'Đang gửi...' : 'Kết bạn'}</Text>
              </TouchableOpacity>
            </View>
          ) : friendshipStatus === 'PENDING_SENT' ? (
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                disabled={sendingRequest}
                onPress={handleCancelFriendRequest}
                style={{ backgroundColor: colors.surfaceVariant, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 12 }}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                  {sendingRequest ? 'Đang xử lý...' : 'Đã gửi lời mời'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 10, borderRadius: 22 }} 
                onPress={handleMessagePress}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          ) : friendshipStatus === 'PENDING_RECEIVED' ? (
            <View style={{ alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                <TouchableOpacity 
                  disabled={sendingRequest}
                  onPress={handleAcceptFriendRequest}
                  style={{ backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Đồng ý</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  disabled={sendingRequest}
                  onPress={handleRejectFriendRequest}
                  style={{ backgroundColor: colors.surfaceVariant, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700', textAlign: 'center' }}>Từ chối</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity 
                style={{ backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 10, borderRadius: 22 }} 
                onPress={handleMessagePress}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

      </View>

      <ProfileBioModal
        visible={bioVisible}
        onClose={() => setBioVisible(false)}
        initialValue={user?.bio ?? ''}
        onSave={() => {
          Alert.alert('Thành công', 'Cập nhật bio thành công');
        }}
      />

      {/* Fullscreen image viewer */}
      <Modal visible={!!imageViewerUri} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}>
          <StatusBar hidden />
          <TouchableOpacity
            style={{ position: 'absolute', top: 48, right: 20, zIndex: 10, padding: 8 }}
            onPress={() => setImageViewerUri(null)}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {imageViewerUri && (
            <Image
              source={{ uri: imageViewerUri }}
              style={{ width: '100%', height: '80%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
