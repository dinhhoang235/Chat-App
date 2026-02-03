import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, Text, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialOption?: string;
  initialExclude?: boolean;
  onSave: (opt: string, excludeReminders: boolean) => void;
};

export default function MuteSettingsModal({ visible, onClose, initialOption = 'Trong 1 giờ', initialExclude = false, onSave }: Props) {
  const [selected, setSelected] = useState<string>(initialOption);
  const [excludeReminders, setExcludeReminders] = useState<boolean>(initialExclude);
  const { scheme, colors } = useTheme();
  const rowBg = colors.surface;

  // Sync when reopened
  React.useEffect(() => {
    if (visible) {
      setSelected(initialOption);
      setExcludeReminders(initialExclude);
    }
  }, [visible, initialOption, initialExclude]);

  const opts = ['Trong 1 giờ', 'Trong 4 giờ', 'Đến 8 giờ sáng', 'Cho đến khi được mở lại'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: rowBg }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Tắt thông báo tin nhắn</Text>

              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <TouchableOpacity onPress={() => setExcludeReminders(prev => !prev)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text }}>Nhắc hẹn</Text>
                {excludeReminders ? <MaterialIcons name="check" size={20} color={colors.tint} /> : <View style={{ width: 20 }} />}
              </TouchableOpacity>

              <Text style={{ color: colors.textSecondary, marginTop: 12, marginBottom: 8 }}>Khoảng thời gian</Text>

              {opts.map((opt, idx) => {
                const is = selected === opt;
                const isLast = idx === opts.length - 1;
                return (
                  <TouchableOpacity key={opt} onPress={() => setSelected(opt)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: isLast ? 'transparent' : colors.border }}>
                    <Text style={{ color: colors.text }}>{opt}</Text>
                    <MaterialIcons name={is ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={is ? colors.tint : colors.textSecondary} />
                  </TouchableOpacity>
                );
              })} 

            </ScrollView>

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
              <TouchableOpacity onPress={() => { onSave(selected, excludeReminders); onClose(); }} style={{ backgroundColor: colors.tint, borderRadius: 999, paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Xong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
