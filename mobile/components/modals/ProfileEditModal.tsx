import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/authContext';
import { userAPI } from '@/services/user';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProfileEditModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [gender, setGender] = useState<string>(user?.gender ?? 'Nam');
  // Display as dd/mm/yyyy; stored as ISO in user.dateOfBirth
  const toDisplay = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  };
  const [dob, setDob] = useState(toDisplay(user?.dateOfBirth));

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setGender(user?.gender ?? 'Nam');
    setDob(toDisplay(user?.dateOfBirth));
  }, [visible, user]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => {
    if (user?.dateOfBirth) {
      return new Date(user.dateOfBirth);
    }
    return new Date();
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setPickerDate(selectedDate);
      const formatted = `${selectedDate.getDate().toString().padStart(2,'0')}/${(selectedDate.getMonth()+1).toString().padStart(2,'0')}/${selectedDate.getFullYear()}`;
      setDob(formatted);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const toISO = (display: string): string | undefined => {
    const parts = display.split('/');
    if (parts.length !== 3) return undefined;
    const [d, m, y] = parts;
    const date = new Date(`${y}-${m}-${d}`);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  const [saving, setSaving] = React.useState(false);

  const onSave = async () => {
    if (!user) return;
    const dateOfBirth = dob ? toISO(dob) : undefined;
    if (dob && !dateOfBirth) {
      Alert.alert('Lỗi', 'Ngày sinh không hợp lệ (định dạng: dd/mm/yyyy)');
      return;
    }
    try {
      setSaving(true);
      const updated = await userAPI.updateUser(user.id, { fullName, gender, dateOfBirth });
      updateProfile({ fullName: updated.fullName, gender: updated.gender, dateOfBirth: updated.dateOfBirth });
      Alert.alert('Thành công', 'Cập nhật thông tin thành công');
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không xác định';
      Alert.alert('Lỗi', `Không thể cập nhật thông tin. ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const disabled = fullName.trim().length === 0 || saving;

  const rowBg = colors.surface;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: rowBg }}>

            {/* Header bar */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Chỉnh sửa thông tin</Text>

              <View style={{ width: 24 }} />
            </View>

            {/* Content */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>Họ và tên</Text>
              <TextInput value={fullName} onChangeText={setFullName} style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} />

              <Text style={{ color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>Ngày sinh</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, { backgroundColor: colors.card, justifyContent: 'center' }]}>
                <Text style={{ color: dob ? colors.text : colors.textSecondary }}>{dob || 'Chọn ngày sinh'}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}

              <Text style={{ color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>Giới tính</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setGender('Nam')} style={[styles.radio, { borderColor: gender === 'Nam' ? colors.tint : colors.border }]}>
                  <Text style={{ color: colors.text }}>Nam</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setGender('Nữ')} style={[styles.radio, { borderColor: gender === 'Nữ' ? colors.tint : colors.border }]}>
                  <Text style={{ color: colors.text }}>Nữ</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: colors.textSecondary, marginTop: 12, marginBottom: 6 }}>Điện thoại</Text>
              <TextInput value={user?.phone ?? ''} editable={false} style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.textSecondary }]} />
            </ScrollView>

            {/* Footer */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TouchableOpacity onPress={onSave} disabled={disabled} style={{ backgroundColor: disabled ? '#9CA3AF' : colors.tint, borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '80%' },
  input: { height: 44, borderRadius: 8, paddingHorizontal: 12 },
  radio: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderRadius: 8 },
  saveButton: { marginTop: 18, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});