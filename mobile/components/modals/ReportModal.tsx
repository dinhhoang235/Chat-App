import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Pressable, TextInput, Alert } from 'react-native';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
}

export default function ReportModal({ visible, onClose, onReport }: Props) {
  const { colors } = useTheme();
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportOther, setReportOther] = useState<string>('');

  useEffect(() => {
    if (!visible) {
      setReportReason(null);
      setReportOther('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Báo xấu</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Chọn lý do:</Text>

              {['Nội dung nhạy cảm', 'Làm phiền', 'Lừa đảo', 'Khác'].map((r) => (
                <TouchableOpacity key={r} className="px-2 py-3 flex-row items-center" onPress={() => setReportReason(r)}>
                  <MaterialIcons name={reportReason === r ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={reportReason === r ? colors.tint : colors.textSecondary} />
                  <Text style={{ color: colors.text, marginLeft: 12 }}>{r}</Text>
                </TouchableOpacity>
              ))}

              {reportReason === 'Khác' && (
                <TextInput
                  value={reportOther}
                  onChangeText={setReportOther}
                  placeholder="Nhập lý do khác"
                  placeholderTextColor={colors.textSecondary}
                  style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, color: colors.text, marginTop: 8 }}
                />
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity onPress={onClose} style={{ padding: 10, marginRight: 8 }}>
                  <Text style={{ color: colors.textSecondary }}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => {
                  const reason = reportReason === 'Khác' ? reportOther : reportReason;
                  if (!reason || (reportReason === 'Khác' && reportOther.trim() === '')) {
                    Alert.alert('Lỗi', 'Vui lòng chọn hoặc nhập lý do.');
                    return;
                  }
                  onReport(reason as string);
                }} style={{ padding: 10 }}>
                  <Text style={{ color: colors.tint, fontWeight: '700' }}>Báo cáo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
