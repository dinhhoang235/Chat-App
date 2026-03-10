import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Modal } from 'react-native';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { getFriendsList } from '@/services/friendship';
import { ContactRow } from '@/components/lists';
import { ContactItem } from '@/components/lists/ContactRow';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface StartChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function StartChatModal({ visible, onClose }: StartChatModalProps) {
  const { colors, scheme } = useTheme();
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFriendsList();
      setContacts(data);
    } catch (err) {
      console.error('Error loading contacts in modal:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadContacts();
    }
  }, [visible, loadContacts]);

  const handleContactPress = (contact: ContactItem) => {
    onClose();
    router.push({
      pathname: `/chat/new`,
      params: { 
        targetUserId: contact.id, 
        name: contact.fullName,
        avatar: contact.avatar 
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ width: 24 }} />

              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Bắt đầu trò chuyện</Text>

              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : (
              <FlatList
                data={contacts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <ContactRow 
                    contact={item} 
                    onPress={() => handleContactPress(item)} 
                  />
                )}
                scrollEnabled={true}
                contentContainerStyle={{ paddingVertical: 8 }}
                ItemSeparatorComponent={() => (
                  <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
