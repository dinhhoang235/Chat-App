import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { contacts } from '../../constants/mockData';
import { useAuth } from '../../context/authContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';

export default function UserProfile() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const id = (params as any).id as string;

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
        <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1200&q=60' }} style={{ height: 220, backgroundColor: '#111' }} />

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
          <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 26 }}>{initials}</Text>

            {/* small online dot */}
            {profile?.online ? (
              <View style={{ position: 'absolute', right: -6, top: 8, backgroundColor: '#10B981', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.background }} />
            ) : null}
          </View>
        </View>

        <View style={{ alignItems: 'center', padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{profile?.name ?? (isStranger ? 'Người dùng' : 'Không xác định')}</Text>
            {isOwn ? (
              <TouchableOpacity style={{ marginLeft: 8 }}>
                <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {profile?.phone ? (
            <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{profile.phone}</Text>
          ) : isStranger ? (
            <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Số điện thoại: {id}</Text>
          ) : null}

          {/* Bio: show under phone number (me or profile) */}
          {(isMeRoute ? user?.bio : profile?.bio) ? (
            <Text style={{ color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>{isMeRoute ? user?.bio : profile?.bio}</Text>
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
              <TouchableOpacity style={{ backgroundColor: '#e5e7eb', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22, marginRight: 12 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Nhắn tin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Kết bạn</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

      </View>
    </SafeAreaView>
  );
}
