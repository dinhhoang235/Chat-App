import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/authContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProfileEditModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [gender, setGender] = useState<string | undefined>((user as any)?.gender ?? 'Nam');
  const [dob, setDob] = useState((user as any)?.dob ?? '');

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setPhone(user?.phone ?? '');
    setGender((user as any)?.gender ?? 'Nam');
    setDob((user as any)?.dob ?? '');
  }, [visible, user]);

  const onSave = () => {
    updateProfile({ fullName, phone, gender, dob });
    onClose();
  };

  const disabled = fullName.trim().length === 0;

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
              <TextInput value={dob} onChangeText={setDob} placeholder="dd/mm/yyyy" style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} />

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
              <TextInput value={phone} onChangeText={setPhone} style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} />
            </ScrollView>

            {/* Footer */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TouchableOpacity onPress={onSave} disabled={disabled} style={{ backgroundColor: disabled ? '#9CA3AF' : colors.tint, borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Lưu</Text>
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