import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

type Action = { key: string; icon: string; label: string; color?: string };

const ACTIONS: Action[] = [
  { key: 'location', icon: 'place', label: 'Vị trí', color: '#FB7185' },
  { key: 'document', icon: 'attach-file', label: 'Tài liệu', color: '#6366F1' },
  { key: 'gif', icon: 'gif', label: '@GIF', color: '#34D399' },
];

export default function ComposerActionsSheet({ visible, onClose, onAction, inline = false }: { visible: boolean; onClose: () => void; onAction: (key: string) => void; inline?: boolean }) {
  const { scheme, colors } = useTheme();
  const overlay = scheme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)';

  const content = (
    <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingTop: 12, paddingBottom: 18 }}>

          <View style={{ paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.key} onPress={() => onAction(a.key)} style={{ width: '25%', alignItems: 'center', paddingVertical: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: a.color || '#EEE', marginBottom: 8 }}>
                <MaterialIcons name={a.icon as any} size={22} color="#fff" />
              </View>
              <Text style={{ color: colors.text, fontSize: 12, textAlign: 'center' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  if (!inline) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={{ flex: 1, backgroundColor: overlay }} onPress={onClose}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            {content}
          </View>
        </Pressable>
      </Modal>
    );
  }

  // Inline variant: render content directly (not modal) so it pushes composer up
  if (!visible) return null;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceVariant }}>
      {content}
    </View>
  );
}
