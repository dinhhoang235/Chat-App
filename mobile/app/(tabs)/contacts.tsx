import React, { useCallback } from 'react';
import { SectionList, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { useTheme } from "../../context/themeContext";
import { useTabBar } from '../../context/tabBarContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { ContactRow, ContactItem } from '../../components/ContactRow';
import { MaterialIcons } from '@expo/vector-icons';
import { getFriendsList, getPendingFriendRequests } from '../../services/friendship';

type Section = {
  title: string;
  data: ContactItem[];
};

export default function Contacts() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = useTabBar();
  const router = useRouter();
  
  const [contacts, setContacts] = React.useState<ContactItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [pendingCount, setPendingCount] = React.useState(0);
  const [searchText, setSearchText] = React.useState('');

  useFocusEffect(
    useCallback(() => {
      loadContacts();
      loadPendingCount();
    }, [])
  );

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await getFriendsList();
      setContacts(data);
      setError('');
    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Không thể tải danh bạ');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const data = await getPendingFriendRequests();
      setPendingCount(data.length);
    } catch (err) {
      console.error('Error loading pending count:', err);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  // Filter contacts based on search
  const filteredContacts = React.useMemo(() => {
    if (!searchText.trim()) return contacts;
    return contacts.filter(contact =>
      contact.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
      contact.phone.includes(searchText)
    );
  }, [contacts, searchText]);

  // Group contacts by first letter
  const sections = React.useMemo(() => {
    const grouped: { [key: string]: ContactItem[] } = {};

    filteredContacts.forEach(contact => {
      const firstLetter = contact.fullName.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(contact);
    });

    return Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter]
      })) as Section[];
  }, [filteredContacts]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header 
          title="Danh bạ" 
          subtitle="Những người liên hệ của bạn"
          showSearch={true}
          onSearch={handleSearch}
          addHref="/new-contact"
          addIconName="person-add"
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header 
        title="Danh bạ" 
        subtitle="Những người liên hệ của bạn"
        showSearch={true}
        onSearch={handleSearch}
        addHref="/new-contact"
        addIconName="person-add"
      />

      {error && (
        <View style={{ backgroundColor: '#FEE2E2', margin: 16, padding: 12, borderRadius: 8 }}>
          <Text style={{ color: '#DC2626' }}>{error}</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={() => {
          return (
            <TouchableOpacity onPress={() => router.push('/friend-requests')} className="px-4 py-3 flex-row items-center" style={{ paddingRight: 0 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' }}>
                <MaterialIcons name="person-add" size={24} color="#fff" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                  Lời mời kết bạn <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>({pendingCount})</Text>
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        renderItem={({ item }) => <ContactRow contact={item} onPress={() => router.push(`/profile/${item.id}`)} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.surface }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{title}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: insets.right + 8, paddingBottom: tabBarHeight + 8 }}
        stickySectionHeadersEnabled
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <Text style={{ color: colors.textSecondary }}>Chưa có bạn bè nào</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
