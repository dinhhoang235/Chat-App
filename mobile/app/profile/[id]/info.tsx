import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';
import { Header, ProfileEditModal } from '@/components';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { userAPI } from '@/services/user';
import type { User } from '@/services/friendship';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ProfileInfo() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params as any).id as string;
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const isMeRoute = id === 'me';

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const userId = isMeRoute && user ? user.id : parseInt(id);
      const userData = await userAPI.getUserById(userId);
      setProfile(userData);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user, isMeRoute]);

  useEffect(() => {
    if (isMeRoute && user) {
      loadProfile();
    } else if (id && id !== 'me') {
      loadProfile();
    }
  }, [id, user, isMeRoute, loadProfile]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return undefined;
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  };

  const displayProfile = {
    name: profile?.fullName || 'Người dùng',
    phone: profile?.phone || '',
    initials: profile?.fullName?.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase() || 'U',
    gender: profile?.gender ?? undefined,
    dob: formatDate(profile?.dateOfBirth),
    avatar: profile?.avatar,
  };

  const isOwn = isMeRoute || (profile?.phone && user?.phone && profile.phone === user.phone);
  const [editVisible, setEditVisible] = React.useState(false);

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Thông tin cá nhân" showBack onBackPress={() => router.back()} />

      <View style={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            {displayProfile.avatar ? (
              <Image
                source={{ uri: `${API_BASE_URL}${displayProfile.avatar}` }}
                style={{ width: 88, height: 88, borderRadius: 44 }}
              />
            ) : (
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 28 }}>{displayProfile.initials}</Text>
            )}
          </View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{displayProfile.name}</Text>
        </View>

        <View style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Giới tính</Text>
            <Text style={{ color: colors.text, marginTop: 6 }}>{displayProfile.gender ?? 'Không có'}</Text>
          </View>

          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Ngày sinh</Text>
            <Text style={{ color: colors.text, marginTop: 6 }}>{displayProfile.dob ?? 'Không có'}</Text>
          </View>

          <View style={{ padding: 12 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Điện thoại</Text>
            <Text style={{ color: colors.text, marginTop: 6 }}>{displayProfile.phone ?? 'Không có'}</Text>
          </View>
        </View>

        {isOwn && (
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <TouchableOpacity onPress={() => setEditVisible(true)} style={{ backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Chỉnh sửa</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      <ProfileEditModal visible={editVisible} onClose={() => setEditVisible(false)} />
    </SafeAreaView>
  );
}
