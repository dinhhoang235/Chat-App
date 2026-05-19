import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Modal, Alert, Image, Switch, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { getFriendsList } from '@/services/friendship';
import { chatApi } from '@/services/chat';
import { ContactItem } from '@/components/lists/ContactRow';
import { getInitials } from '@/utils/initials';
import { getAvatarUrl } from '@/utils/avatar';

type ShareContactModalProps = {
  visible: boolean;
  onClose: () => void;
  conversationId: string | null;
};

export default function ShareContactModal({ visible, onClose, conversationId }: ShareContactModalProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);
  const [sending, setSending] = useState(false);
  const [includePhone, setIncludePhone] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [allContacts, setAllContacts] = useState<ContactItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContactItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFriendsList();
      const friendItems = (data || []).map((f: any) => ({
        id: f.friendId || f.id,
        fullName: f.friend?.fullName || f.fullName,
        phone: f.friend?.phone || f.phone,
        avatar: f.friend?.avatar || f.avatar,
        coverImage: f.friend?.coverImage || f.coverImage,
      }));
      setAllContacts(friendItems);
      setContacts(friendItems);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadInitialData();
      setSelectedIds([]);
      setSearchQuery('');
      setSearchResults(null);
    }
  }, [visible, loadInitialData]);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSearchResults(null);
      setContacts(allContacts);
      return;
    }

    // Filter local first
    const filtered = allContacts.filter(c => 
      c.fullName.toLowerCase().includes(text.toLowerCase()) || 
      (c.phone && c.phone.includes(text))
    );
    setContacts(filtered);

    // If it looks like a phone number, try remote search
    if (/^\d+$/.test(text) && text.length >= 10) {
      try {
        setSearching(true);
        const res = await searchFriendByPhone(text);
        const result = res?.data || res; // Lấy dữ liệu user thực sự
        if (result && result.id && !filtered.find(f => String(f.id) === String(result.id))) {
          setSearchResults([result]);
        }
      } catch (err) {
        // Ignore search errors
      } finally {
        setSearching(false);
      }
    }
  };

  const toggleSelection = (id: number | string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectedContacts = contacts.filter((contact) => selectedIds.includes(contact.id));

  const handleSend = async (includePhone: boolean) => {
    if (!conversationId) {
      Alert.alert('Lỗi', 'Không xác định được cuộc trò chuyện.');
      return;
    }

    if (selectedContacts.length === 0) {
      Alert.alert('Chọn bạn bè', 'Vui lòng chọn ít nhất một bạn bè để gửi danh thiếp.');
      return;
    }

    setSending(true);
    try {
      for (const contact of selectedContacts) {
        const contactData = {
          id: contact.id,
          fullName: contact.fullName,
          phone: includePhone ? contact.phone : undefined,
          avatar: contact.avatar,
          coverImage: contact.coverImage,
        };
        await chatApi.sendMessage(Number(conversationId), JSON.stringify(contactData), 'contact');
      }
      onClose();
    } catch (err) {
      console.error('Error sending shared contacts:', err);
      Alert.alert('Lỗi', 'Không thể gửi danh thiếp. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ContactItem }) => {
    const selected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleSelection(item.id)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
          {item.avatar ? (
            <Image
              source={{ uri: getAvatarUrl(item.avatar) || undefined }}
              style={{ width: 42, height: 42, borderRadius: 21 }}
            />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700' }}>{getInitials(item.fullName)}</Text>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{item.fullName}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{item.phone || 'Không có số điện thoại'}</Text>
        </View>

        <MaterialIcons
          name={selected ? 'check-box' : 'check-box-outline-blank'}
          size={24}
          color={selected ? colors.tint : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, marginTop: 100, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 8 }} numberOfLines={1} adjustsFontSizeToFit>Chọn bạn bè để gửi danh thiếp </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceVariant || '#f0f0f0', borderRadius: 10, paddingHorizontal: 12 }}>
                <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  placeholder="Tìm theo tên hoặc số điện thoại..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  style={{ flex: 1, paddingVertical: 8, marginLeft: 8, color: colors.text }}
                  placeholderTextColor={colors.textSecondary}
                />
                {searching && <ActivityIndicator size="small" color={colors.tint} />}
              </View>
            </View>

            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : (
              <FlatList
                data={searchResults ? [...searchResults, ...contacts.filter(c => !searchResults.find(s => s.id === c.id))] : contacts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
                ListEmptyComponent={() => (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary }}>{searchQuery.length > 0 ? 'Không tìm thấy kết quả' : 'Không có liên hệ nào.'}</Text>
                  </View>
                )}
              />
            )}

            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom || 16, paddingTop: 12, paddingHorizontal: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Gửi kèm số điện thoại</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{selectedContacts.length} bạn bè được chọn</Text>
                </View>
                <Switch
                  value={includePhone}
                  onValueChange={setIncludePhone}
                  trackColor={{ false: colors.border, true: colors.tint }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                onPress={() => handleSend(includePhone)}
                disabled={sending || selectedContacts.length === 0}
                style={{ backgroundColor: selectedContacts.length === 0 ? colors.surfaceVariant || '#eee' : colors.tint, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Gửi danh thiếp </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
