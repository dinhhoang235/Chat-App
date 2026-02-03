import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useTheme } from '../context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { contacts as mockContacts } from '../constants/mockData';

export default function NewGroup() {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'recent' | 'contacts'>('recent');
  const [selected, setSelected] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  const selectedContacts = selected
    .map(id => mockContacts.find(c => c.id === id))
    .filter((c): c is typeof mockContacts[0] => !!c);

  const filtered = useMemo(() => {
    const base = tab === 'recent' ? mockContacts.slice(0, 10) : mockContacts;
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
  }, [query, tab]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity onPress={() => toggle(item.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <TouchableOpacity onPress={() => toggle(item.id)} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
        {selected.includes(item.id) ? (
          <MaterialIcons name="radio-button-checked" size={20} color={colors.tint || '#34D399'} />
        ) : (
          <MaterialIcons name="radio-button-unchecked" size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: item.color || '#6B7280', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>{item.initials}</Text>
      </View>

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16 }}>{item.name}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>23 phút trước</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Nhóm mới" subtitle={`Đã chọn: ${selected.length}`} showBack />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <MaterialIcons name="photo-camera" size={24} color={colors.icon} />
          </TouchableOpacity>

          <TextInput
            placeholder="Đặt tên nhóm"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginLeft: 12, flex: 1 }}
          />
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <MaterialIcons name="search" size={20} color={colors.icon} />
            <TextInput
              placeholder="Tìm tên hoặc số điện thoại"
              placeholderTextColor={colors.textSecondary}
              style={{ color: colors.text, marginLeft: 10, flex: 1 }}
              value={query}
              onChangeText={setQuery}
            />
            <View style={{ backgroundColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>123</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.background }}>
        <TouchableOpacity onPress={() => setTab('recent')} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: tab === 'recent' ? colors.text : colors.textSecondary, fontWeight: tab === 'recent' ? '700' : '600' }}>GẦN ĐÂY</Text>
          {tab === 'recent' && <View style={{ height: 2, backgroundColor: colors.tint || '#34D399', marginTop: 6, borderRadius: 1 }} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab('contacts')} style={{ paddingHorizontal: 12, paddingVertical: 6, marginLeft: 12 }}>
          <Text style={{ color: tab === 'contacts' ? colors.text : colors.textSecondary, fontWeight: tab === 'contacts' ? '700' : '600' }}>DANH BẠ</Text>
          {tab === 'contacts' && <View style={{ height: 2, backgroundColor: colors.tint || '#34D399', marginTop: 6, borderRadius: 1 }} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
      />

      {selected.length > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.header, borderRadius: 0, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: insets.bottom + 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
            {selectedContacts.map((c) => (
              <View key={c.id} style={{ marginRight: 8, position: 'relative' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.color || '#6B7280', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{c.initials}</Text>
                </View>
                <TouchableOpacity onPress={() => toggle(c.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
                  <MaterialIcons name="close" size={12} color={colors.text} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={() => { /* TODO: tạo nhóm */ }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}
