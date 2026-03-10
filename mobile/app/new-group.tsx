import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, GroupAvatarPicker } from '@/components';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { getFriendsList } from '@/services/friendship';
import { ContactItem } from '@/components/lists/ContactRow';
import { chatApi } from '../services/chat';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export default function NewGroup() {
  const { colors } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<(number | string)[]>([]);
  const [friends, setFriends] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const data = await getFriendsList();
      setFriends(data || []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách bạn bè:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách bạn bè');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async (action: 'take' | 'library') => {
    let result;
    
    if (action === 'take') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const selectedContacts = useMemo(() => {
    return selected
      .map(id => friends.find(f => f.id === id))
      .filter((u): u is ContactItem => !!u);
  }, [selected, friends]);

  const filtered = useMemo(() => {
    const list = friends || [];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(f => 
      (f.fullName || '').toLowerCase().includes(q) || 
      (f.phone || '').includes(q)
    );
  }, [query, friends]);

  const toggle = (id: number | string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    setCreating(true);
    try {
      await chatApi.createGroup(name.trim(), selected, avatarUri || undefined);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Lỗi khi tạo nhóm:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhóm. Vui lòng thử lại sau.');
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: ContactItem }) => {
    const initials = item.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    
    return (
      <TouchableOpacity onPress={() => toggle(item.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
          {selected.includes(item.id) ? (
            <MaterialIcons name="radio-button-checked" size={24} color={colors.tint || '#34D399'} />
          ) : (
            <MaterialIcons name="radio-button-unchecked" size={24} color={colors.textSecondary} />
          )}
        </View>

        <View style={{ marginLeft: 12 }}>
          {item.avatar ? (
            <Image
              source={{ uri: `${API_BASE_URL}${item.avatar}` }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
          ) : (
            <View
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
            </View>
          )}
        </View>

        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{item.fullName}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{item.phone}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Nhóm mới" subtitle={`Đã chọn: ${selected.length}`} showBack />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setIsPickerVisible(true)}
            style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            ) : (
              <MaterialIcons name="photo-camera" size={24} color={colors.icon} />
            )}
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
          </View>
        </View>
      </View>

      <GroupAvatarPicker
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onPick={handlePickImage}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
          ListEmptyComponent={() => (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary }}>Không tìm thấy bạn bè nào</Text>
            </View>
          )}
        />
      )}

      {selected.length > 0 && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.header, borderRadius: 0, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: insets.bottom + 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
            {selectedContacts.map((c) => {
                const sInitials = c.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                return (
              <View key={c.id} style={{ marginRight: 8, position: 'relative' }}>
                {c.avatar ? (
                  <Image
                    source={{ uri: `${API_BASE_URL}${c.avatar}` }}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                  />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{sInitials}</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => toggle(c.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
                  <MaterialIcons name="close" size={12} color={colors.text} />
                </TouchableOpacity>
              </View>
                );
            })}
          </ScrollView>

          <TouchableOpacity 
            onPress={handleCreateGroup} 
            disabled={creating}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', opacity: creating ? 0.6 : 1 }}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}
