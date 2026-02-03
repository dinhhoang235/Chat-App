import React, { useState, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { Header } from '../../components/Header';
import MessageBubble from '../../components/MessageBubble';
import { MaterialIcons } from '@expo/vector-icons';
import ComposerActionsSheet from '../../components/ComposerActionsSheet';
import { useTheme } from '../../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";


const sampleMessages = [
  { id: 's1', type: 'separator', text: '12:37 24/09/2025' },
  { id: 'm1', type: 'sticker', text: 'sticker', time: '12:37', fromMe: true },
  { id: 'm2', type: 'text', text: 'Linh sinh nhật vui vẻ! Hy vọng hôm nay bạn sẽ có một ngày thật tuyệt vời với nhiều niềm vui, bánh gato, quà cáp và những lời chúc ấm áp từ bạn bè. Chúc mừng sinh nhật nhé 🎉🎂🎈', time: '12:37', fromMe: true },
  { id: 'm2b', type: 'text', text: 'Ngoài ra mình muốn kể cho bạn nghe về dự án mới mà mình đang làm: nó có một stack khá hay, gồm TypeScript, React Native, Expo, và một số trick để tối ưu hiệu năng trên thiết bị cũ. Mình nghĩ sẽ mời bạn thử nghiệm sớm nhé!', time: '12:38', fromMe: true },
  { id: 'm3', type: 'text', text: 'Cảm ơn nhaa! Mình đọc mà thấy xúc động quá, cảm ơn bạn rất nhiều vì đã nhớ và dành thời gian để viết những điều hay thế này. Mình sẽ giữ lời chúc này suốt 😭❤️', time: '12:41', fromMe: false, reactions: [{ emoji: '❤️', count: 1 }] },
  { id: 'm3b', type: 'text', text: 'À mà này, tối nay có lịch họp nhóm không? Mình có vài ý tưởng muốn góp ý: 1) tối ưu call API; 2) thêm caching; 3) refactor component để tái sử dụng. Nếu được mình sẽ soạn slide ngắn gửi lên trước.', time: '12:45', fromMe: false },
  { id: 's2', type: 'separator', text: '20:55 12/01/2026' },
  { id: 'm4', type: 'contact', contactName: 'Ninh Phuong', time: '20:55', fromMe: false },
  { id: 'm5', type: 'text', text: 'ok cảm ơn. Mình đã nhận được thông tin và sẽ phản hồi chi tiết nhất có thể trong hôm nay hoặc chậm nhất là sáng mai. Nếu cần gấp, cứ gọi mình nhé.', time: '20:55', fromMe: true, reactions: [{ emoji: '❤️', count: 1 }] },
  { id: 'm6', type: 'text', text: 'Đây là một tin nhắn rất dài để test wrap text trong giao diện. Nó gồm nhiều câu, nhiều đoạn, có ký tự đặc biệt và emoji 😅. Mục tiêu là kiểm tra xem Bubble có giới hạn chiều rộng đúng không, có bị overflow hay không, và khoảng cách giữa các phần tử có hợp lý không. Còn nữa: thêm một vài từ dài không có dấu cáchsssssssssssssssssssssssssssssss để thử overflow.', time: '21:00', fromMe: false },
  { id: 'm7', type: 'sticker', text: 'https://via.placeholder.com/320x200.png?text=BIG+STICKER', time: '21:05', fromMe: false },
];

export default function ChatThread() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();
  const [composerVisible, setComposerVisible] = useState(false);
  const inputRef = useRef<any>(null);
  const [messageText, setMessageText] = useState('');

  const renderItem = ({ item }: any) => (
    <MessageBubble message={item} />
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header 
        title={(params as any).id || 'Chat'} 
        showBack 
        onBackPress={() => router.back()}
        rightActions={[
          { icon: 'call', onPress: () => console.log('Call pressed') },
          { icon: 'videocam', onPress: () => console.log('Video call pressed') },
          { icon: 'more-vert', onPress: () => router.push(`/chat/${(params as any).id}/options`) },
        ]}
      />

      <FlatList
        data={sampleMessages}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 12 }}
      />



      <View className="px-4 py-3 flex-row items-center" style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <TouchableOpacity className="mr-3">
          <MaterialIcons name="emoji-emotions" size={24} color={colors.icon} />
        </TouchableOpacity>

        <View className="flex-1 px-2 py-2 mr-3" style={{ backgroundColor: 'transparent', borderRadius: 8 }}>
          <TextInput
            ref={inputRef}
            value={messageText}
            onChangeText={text => setMessageText(text)}
            placeholder="Tin nhắn"
            placeholderTextColor={colors.textSecondary}
            style={{ color: colors.text }}
            onFocus={() => setComposerVisible(false)}
          />
        </View>

        {/* Right action icons: show send when typing, otherwise more/mic/image */}
        <View className="flex-row items-center">
          {messageText.trim().length > 0 ? (
            <TouchableOpacity onPress={() => { console.log('Send:', messageText); setMessageText(''); inputRef.current?.blur?.(); Keyboard.dismiss(); }}>
              <MaterialIcons name="send" size={28} color={colors.tint} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity className="mr-4" onPress={() => { inputRef.current?.blur?.(); Keyboard.dismiss(); setComposerVisible(v => !v); }}>
                <MaterialIcons name="more-horiz" size={20} color={composerVisible ? colors.tint : colors.icon} />
              </TouchableOpacity>

              <TouchableOpacity className="mr-4" onPress={() => console.log('Mic pressed')}>
                <MaterialIcons name="mic" size={24} color={colors.icon} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => console.log('Image pressed')}>
                <MaterialIcons name="image" size={22} color={colors.icon} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {composerVisible && (
        <ComposerActionsSheet
          inline
          visible={composerVisible}
          onClose={() => setComposerVisible(false)}
          onAction={(key) => { console.log('Composer action:', key); setComposerVisible(false); }}
        />
      )}

    </SafeAreaView>
  );
}
