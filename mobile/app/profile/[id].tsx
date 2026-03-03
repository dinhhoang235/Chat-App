import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Alert, Image, Modal, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { contacts } from '../../constants/mockData';
import { useAuth } from '../../context/authContext';
import { Header } from '../../components/Header';
import ProfileBioModal from '../../components/ProfileBioModal';
import { MaterialIcons } from '@expo/vector-icons';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function UserProfile() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const id = (params as any).id as string;
  const [bioVisible, setBioVisible] = React.useState(false);
  const [imageViewerUri, setImageViewerUri] = React.useState<string | null>(null);

  // Support special 'me' route which shows the logged-in user's profile
  const isMeRoute = id === 'me';
  let profile = contacts.find((c) => c.id === id);

  if (isMeRoute && user) {
    profile = { id: 'me', name: user.fullName, phone: user.phone, initials: user.fullName?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase(), color: colors.tint } as any;
  }

  // If not found and id looks like a phone number, treat as stranger with phone as id
  const isPhoneLike = /^\d+$/.test(id || '');
  const isOwn = isMeRoute || (profile?.phone && user?.phone && profile.phone === user.phone);
  const isFriend = !!profile && !isOwn;
  const isStranger = !profile && isPhoneLike;

  const initials = profile?.initials ?? (profile?.name ? profile.name.split(' ').map(n => n[0]).slice(0,2).join('') : (id ? id.slice(-2).toUpperCase() : 'U'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => {
          if (isMeRoute && user?.coverImage) {
            setImageViewerUri(`${API_BASE_URL}${user.coverImage}`);
          }
        }}>
          <ImageBackground
            source={isMeRoute && user?.coverImage
              ? { uri: `${API_BASE_URL}${user.coverImage}` }
              : undefined
            }
            style={{ height: 220, backgroundColor: '#2563EB' }}
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
        <View style={{ height: 56 + insets.top }} />

        {/* Avatar + name (raise avatar above cover) */}
        <View style={{ alignItems: 'center', marginTop: -120 - insets.top }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => isMeRoute && user?.avatar && setImageViewerUri(`${API_BASE_URL}${user.avatar}`)}
            style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 }}
          >
            {isMeRoute && user?.avatar ? (
              <Image
                source={{ uri: `${API_BASE_URL}${user.avatar}` }}
                style={{ width: 86, height: 86, borderRadius: 43 }}
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
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{profile?.name ?? (isStranger ? 'Người dùng' : 'Không xác định')}</Text>
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
          {isFriend ? (
            <View style={{ alignItems: 'center', marginBottom: 6 }}>
              <TouchableOpacity style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 22 }} onPress={() => router.push(`/chat/${profile?.id}`)}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          ) : isStranger ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity style={{ backgroundColor: colors.surfaceVariant, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22, marginRight: 12 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Nhắn tin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Kết bạn</Text>
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
