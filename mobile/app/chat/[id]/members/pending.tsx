import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, Switch, Modal, TextInput, Pressable, Alert } from 'react-native';
import { useTheme } from '@/context/themeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Header } from '@/components';
import { contacts } from '@/constants/mockData';
import { useAuth } from '@/context/authContext';

export default function MemberPendingSettings() {
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = (params as any).id as string;
  const { user } = useAuth();

  const contact = contacts.find(c => c.id === id);
  const isOwner = !!contact?.ownerPhone && user?.phone === contact?.ownerPhone;

  const [enabled, setEnabled] = useState<boolean>(!!contact?.requireApproval);
  const [question, setQuestion] = useState<string>('');
  const [questionModalVisible, setQuestionModalVisible] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Duyệt thành viên" showBack onBackPress={() => router.back()} />

      <View style={{ padding: 12 }}>
        <Text style={{ color: colors.tint, fontWeight: '700', marginBottom: 8 }}>Cài đặt</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.surfaceVariant }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Duyệt thành viên</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Khi bật, yêu cầu tham gia phải được duyệt bởi trưởng hoặc phó nhóm</Text>
          </View>
          <Switch value={enabled} onValueChange={(v) => setEnabled(v)} thumbColor={enabled ? '#fff' : '#fff'} trackColor={{ false: colors.textSecondary, true: colors.success }} disabled={!isOwner} />
        </View>

        {enabled ? (
          <>
            <Text style={{ color: colors.tint, fontWeight: '700', marginTop: 18, marginBottom: 8 }}>Tùy chọn xét duyệt</Text>

            <TouchableOpacity onPress={() => { if (isOwner) { setDraft(question); setQuestionModalVisible(true); } }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Câu hỏi</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{question ? question : 'Chưa có câu hỏi'}</Text>
            </TouchableOpacity>

            <Text style={{ color: colors.tint, fontWeight: '700', marginTop: 18, marginBottom: 8 }}>Yêu cầu tham gia</Text>

            <TouchableOpacity onPress={() => router.push(`/chat/${id}/members?mode=pending`)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Danh sách yêu cầu</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Người yêu cầu tham gia nhóm này sẽ thấy câu hỏi (mock)</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {/* Question modal */}
        <Modal visible={questionModalVisible} transparent animationType="fade" onRequestClose={() => setQuestionModalVisible(false)}>
          <Pressable style={{ flex: 1, backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setQuestionModalVisible(false)}>
            <Pressable style={{ width: '86%', backgroundColor: colors.surface, borderRadius: 8, padding: 12 }} onPress={() => {}}>
              <Text style={{ textAlign: 'center', color: colors.text, fontWeight: '700', marginBottom: 8 }}>Nhập câu hỏi của bạn</Text>
              <Text style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: 6 }}>{`${draft.length}/250`}</Text>
              <TextInput multiline maxLength={250} value={draft} onChangeText={setDraft} placeholder="Vì sao bạn muốn tham gia nhóm?" placeholderTextColor={colors.textSecondary} style={{ minHeight: 100, backgroundColor: colors.background, color: colors.text, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: colors.surfaceVariant }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <TouchableOpacity onPress={() => setQuestionModalVisible(false)} style={{ padding: 12 }}>
                  <Text style={{ color: colors.textSecondary }}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setQuestion(draft); setQuestionModalVisible(false); Alert.alert('Lưu', 'Câu hỏi đã được lưu (mock)'); }} style={{ padding: 12 }}>
                  <Text style={{ color: colors.tint, fontWeight: '600' }}>Lưu</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

      </View>
    </SafeAreaView>
  );
}