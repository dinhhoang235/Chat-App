import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Text, ScrollView, Switch, TextInput, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { contacts } from '../constants/mockData';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave?: (selectedIds: string[]) => void;
  initialSelected?: string[];
};

export default function AddToGroupModal({ visible, onClose, onSave, initialSelected = [] }: Props) {
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState('');
  const [excludeRecent, setExcludeRecent] = useState(false);
  const rowBg = colors.surface;
  const overlayColor = scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';

  useEffect(() => {
    if (visible) {
      setSelected(initialSelected);
      setQuery('');
      setExcludeRecent(false);
    }
  }, [visible, initialSelected]);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const filtered = contacts.filter(c => (c.name || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: overlayColor }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: rowBg }}>

            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Thêm vào nhóm</Text>

              <View style={{ width: 24 }} />
            </View>

            <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Tìm tên hoặc số điện thoại"
                placeholderTextColor={colors.textSecondary}
                style={{ backgroundColor: colors.background, color: colors.text, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.surfaceVariant }}
              />

              <TouchableOpacity onPress={() => { /* invite by link placeholder */ }} style={{ marginTop: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="link" size={20} color={colors.tint} />
                <Text style={{ color: colors.text, marginLeft: 12 }}>Mời vào nhóm bằng link</Text>
              </TouchableOpacity>

              <Text style={{ color: colors.tint, fontWeight: '700', marginTop: 16 }}>Danh bạ</Text>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => toggleSelect(item.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: item.color ?? colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{item.initials ?? 'U'}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>{item.phone ?? ''}</Text>
                  </View>

                  <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
                    {selected.includes(item.id) ? <MaterialIcons name="check" size={18} color={colors.tint} /> : null}
                  </View>
                </TouchableOpacity>
              )}
            />

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 0 }}>
              <TouchableOpacity onPress={() => setExcludeRecent(prev => !prev)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                <Text style={{ color: colors.text }}>Thành viên mới xem được tin gửi gần đây</Text>
                <Switch value={excludeRecent} onValueChange={setExcludeRecent} thumbColor={excludeRecent ? '#fff' : '#fff'} trackColor={{ false: colors.textSecondary, true: colors.success }} />
              </TouchableOpacity>
            </View>

            {/* bottom selected bar (like NewGroup) */}
            {selected.length > 0 && (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.header, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: insets.bottom + 12 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
                  {selected.map(id => {
                    const c = contacts.find(cc => cc.id === id);
                    if (!c) return null;
                    return (
                      <View key={id} style={{ marginRight: 8, position: 'relative' }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.color ?? '#6B7280', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>{c.initials}</Text>
                        </View>
                        <TouchableOpacity onPress={() => toggleSelect(id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
                          <MaterialIcons name="close" size={12} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity onPress={() => { onSave?.(selected); onClose(); }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}