import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/themeContext';
import { Header } from '../../../components/Header';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { contacts } from '../../../constants/mockData';
import { useAuth } from '../../../context/authContext';
import ProfileEditModal from '../../../components/ProfileEditModal';

export default function ProfileInfo() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params as any).id as string;

  const profile = contacts.find((c) => c.id === id) || { name: 'Người dùng' } as any;
  const isMeRoute = id === 'me';
  const isOwn = isMeRoute || (profile?.phone && user?.phone && profile.phone === user.phone);

  // use account info when viewing "me"
  const formatDate = (iso?: string | null) => {
    if (!iso) return undefined;
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  };

  const displayProfile = isMeRoute && user ? {
    name: user.fullName,
    phone: user.phone,
    initials: user.fullName?.split(' ').map((n: string) => n[0]).slice(0,2).join('').toUpperCase(),
    gender: user.gender ?? undefined,
    dob: formatDate(user.dateOfBirth),
  } : profile;
  const [editVisible, setEditVisible] = React.useState(false);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Thông tin cá nhân" showBack onBackPress={() => router.back()} />

      <View style={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 28 }}>{(displayProfile.initials || displayProfile.name?.slice(0,2) || 'U').toUpperCase()}</Text>
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
