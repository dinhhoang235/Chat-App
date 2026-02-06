import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../../context/themeContext';
import { Header } from '../../../components/Header';
import MessageBubble from '../../../components/MessageBubble';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

type ChatMessage = {
  id: string;
  text?: string;
  time?: string;
  fromMe?: boolean;
  type?: 'text' | 'sticker' | 'contact' | 'separator';
  contactName?: string;
  contactAvatarColor?: string;
  reactions?: { emoji: string; count?: number }[];
};

export default function PinnedMessages() {
  const { colors } = useTheme();
  const router = useRouter();

  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([
    { id: 'pm1', text: 'Nhắc: nộp báo cáo trước 5pm', time: 'Hôm nay, 10:12', fromMe: false, type: 'text' },
    { id: 'pm2', text: 'Cuộc họp dời sang 9h sáng mai', time: 'Hôm qua, 18:22', fromMe: true, type: 'text' },
  ]);

  const clearAll = () => {
    Alert.alert('Xóa tất cả', 'Bạn có chắc muốn hủy ghim tất cả tin nhắn?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => setPinnedMessages([]) },
    ]);
  };

  const unpin = (msgId: string) => {
    setPinnedMessages(prev => prev.filter(m => m.id !== msgId));
    Alert.alert('Đã hủy ghim', 'Tin nhắn đã được hủy ghim.');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={{ paddingHorizontal: 8 }}>
      <MessageBubble
        message={item}
        onPress={() => Alert.alert('Chuyển đến tin nhắn', 'Tạm mock: điều hướng đến vị trí tin nhắn trong cuộc trò chuyện.')}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => unpin(item.id)} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ color: colors.tint }}>Hủy ghim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Tin nhắn đã ghim" showBack onBackPress={() => router.back()} rightActions={[{ icon: 'delete', onPress: clearAll }]} />

      {pinnedMessages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
            <MaterialIcons name="push-pin" size={36} color={colors.textSecondary} />
          </View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16 }}>Chưa có tin nhắn đã ghim</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>Khi bạn ghim tin nhắn, nó sẽ xuất hiện tại đây.</Text>
        </View>
      ) : (
        <FlatList
          data={pinnedMessages}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </SafeAreaView>
  );
}
