import React, { useState } from 'react';
import { Modal, Pressable, View, Text, ScrollView, Switch } from 'react-native';
import { useTheme } from '../context/themeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialEnabled?: boolean;
  onSave?: (enabled: boolean) => void;
};

export default function PresenceStatusModal({ visible, onClose, initialEnabled = true, onSave }: Props) {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const { scheme, colors } = useTheme();
  const rowBg = colors.surface;
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  React.useEffect(() => {
    if (visible) setEnabled(initialEnabled);
  }, [visible, initialEnabled]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: overlayColor }} onPress={onClose}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: rowBg, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>

          <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', borderRadius: 2, marginBottom: 8 }} />

          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' }}>Hiện trạng thái truy cập</Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Hiện trạng thái truy cập</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 6 }}>Khi tắt, bạn không thấy khi bạn bè truy cập và họ cũng không thấy trạng thái của bạn.</Text>
              </View>

              <Switch value={enabled} onValueChange={(v) => { setEnabled(v); onSave?.(v); }} thumbColor={enabled ? '#fff' : '#fff'} trackColor={{ false: colors.textSecondary, true: colors.success }} />
            </View>

          </ScrollView>

        </View>
      </Pressable>
    </Modal>
  );
}
