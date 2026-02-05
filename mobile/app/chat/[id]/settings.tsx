import React, { useState } from 'react';
import { View, Text, Switch, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { contacts } from '../../../constants/mockData';
import { useAuth } from '../../../context/authContext';

export default function GroupSettings() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = (params as any).id as string;

  const contact = contacts.find(c => c.id === id);
  const isOwner = !!contact?.ownerPhone && user?.phone === contact?.ownerPhone;

  const [requireApproval, setRequireApproval] = useState<boolean>(!!contact?.requireApproval);

  const confirmDelete = () => {
    Alert.alert('Xóa nhóm', 'Bạn có chắc muốn xóa nhóm này? Hành động không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => { console.log('Group deleted:', id); router.back(); } }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: 12 }}>Cài đặt nhóm</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.text }}>Yêu cầu phê duyệt thành viên</Text>
          <Switch value={requireApproval} onValueChange={setRequireApproval} />
        </View>

        {isOwner ? (
          <TouchableOpacity onPress={confirmDelete} style={{ marginTop: 24 }}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Xóa nhóm</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
}