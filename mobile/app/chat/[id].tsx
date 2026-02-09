import React, { useState, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { Header } from '../../components/Header';
import InThreadSearch from '../../components/InThreadSearch';
import MessageBubble from '../../components/MessageBubble';
import { MaterialIcons } from '@expo/vector-icons';
import ComposerActionsSheet from '../../components/ComposerActionsSheet';
import { useTheme } from '../../context/themeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSearch } from '../../context/searchContext';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";


const sampleMessagesDefault = [
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

const sampleMessagesGroupG1 = [
  { id: 'g-s1', type: 'separator', text: '12:00 01/02/2026' },
  { id: 'g-m1', type: 'text', text: 'Chào cả nhóm, mình share tài liệu buổi hôm nay ở đây.', time: '12:01', fromMe: false },
  { id: 'g-m2', type: 'text', text: 'Mọi người ơi, ai có link slides không?', time: '12:03', fromMe: true },
  { id: 'g-m3', type: 'text', text: 'Mình có, để mình upload lên.', time: '12:04', fromMe: false },
  { id: 'g-m4', type: 'text', text: 'Team, mọi người check tiến độ PR nhé.', time: '12:10', fromMe: false },
];

export default function ChatThread() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const router = useRouter();

  // pick sample messages for this thread (use group messages when id === 'g1')
  const id = (params as any).id as string;
  const sampleMessages = id === 'g1' ? sampleMessagesGroupG1 : sampleMessagesDefault;

  // Search mode toggled by Options or header
  const initialSearch = !!(params as any).search;
  const [searchMode, setSearchMode] = useState<boolean>(initialSearch);
  const flatListRef = useRef<FlatList>(null);

  // lifted search state
  const [searchQuery, setSearchQuery] = useState('');
  const [resultIndices, setResultIndices] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const [composerVisible, setComposerVisible] = useState(false);
  const inputRef = useRef<any>(null);
  const [messageText, setMessageText] = useState('');

  const insets = useSafeAreaInsets();

  // Keyboard height tracking using useKeyboardHandler (Expo recommended)
  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler(
    {
      onMove: (event) => {
        'worklet';
        keyboardHeight.value = Math.max(event.height, 0);
      },
    },
    []
  );

  const composerHeight = 64; // reserve space for composer

  // Static padding - animated spacer handles pushing content up
  const listPaddingBottom = 12 + composerHeight + insets.bottom;

  React.useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setResultIndices([]);
      setCurrentResultIndex(0);
      return;
    }
    const idxs: number[] = [];
    sampleMessages.forEach((m, idx) => {
      if (m.type === 'text' && m.text?.toLowerCase().includes(q)) idxs.push(idx);
    });
    setResultIndices(idxs);
    setCurrentResultIndex(0);
  }, [searchQuery, sampleMessages]);

  // Listen to SearchContext open events to avoid navigation flicker
  const { openFor, close } = useSearch();
  const isFocused = useIsFocused();
  const [pendingOpen, setPendingOpen] = useState(false);

  React.useEffect(() => {
    // if a request to open search for this chat is received
    if (openFor && openFor === (params as any).id) {
      if (isFocused) {
        setSearchMode(true);
        setPendingOpen(false);
      } else {
        // wait until screen is focused
        setPendingOpen(true);
      }
    }
  }, [openFor, params, isFocused]);

  // when screen becomes focused and we have pending open, enable search mode
  React.useEffect(() => {
    if (isFocused && pendingOpen) {
      setSearchMode(true);
      setPendingOpen(false);
    }
  }, [isFocused, pendingOpen]);

  // When searchMode is closed, tell context to close
  React.useEffect(() => {
    if (!searchMode && openFor === (params as any).id) {
      close();
    }
  }, [searchMode, openFor, params, close]);

  return (
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: colors.surface }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1 }} >
          {searchMode ? (
            // header replaced by search header
            <InThreadSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              resultIndices={resultIndices}
              currentResultIndex={currentResultIndex}
              onSetCurrentResultIndex={setCurrentResultIndex}
              onClose={() => setSearchMode(false)}
              onScrollToMessage={(idx) => flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5 })}
              renderMode="header"
            />
          ) : (
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
          )}

          <FlatList
            ref={flatListRef}
            data={sampleMessages}
            keyExtractor={(i) => i.id}
            renderItem={({ item, index }: any) => (
              <MessageBubble 
                message={item} 
                highlightQuery={searchQuery} 
                onPress={() => { if (composerVisible) setComposerVisible(false); }} 
                onAvatarPress={() => {
                  if (item.fromMe) return router.push('/profile/me');

                  // If this is a 1:1 chat (chat id not starting with 'g'), use chat id as profile id
                  if (id && !id.startsWith('g')) {
                    return router.push(`/profile/${id}`);
                  }

                  // Otherwise try to derive from message (senderId or contactName), fallback to unknown
                  const senderId = (item as any).senderId ?? (item.contactName ? item.contactName.replace(/\s+/g, '') : 'unknown');
                  router.push(`/profile/${encodeURIComponent(senderId)}`);
                }}
              />
            )}
            contentContainerStyle={{ 
              paddingVertical: 12, 
              paddingBottom: listPaddingBottom
            }}
          />

          {/* Bottom search bar: replace composer when in searchMode */}
          {searchMode ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.surfaceVariant,
                backgroundColor: colors.surface,
              }}
            >
              <InThreadSearch
                messages={sampleMessages as any}
                query={searchQuery}
                onQueryChange={setSearchQuery}
                resultIndices={resultIndices}
                currentResultIndex={currentResultIndex}
                onSetCurrentResultIndex={setCurrentResultIndex}
                onClose={() => setSearchMode(false)}
                onScrollToMessage={(idx) => flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5 })}
                renderMode="bottom"
              />

              {/* Animated spacer for search mode - same as composer */}
              <Animated.View
                style={[
                  { 
                    backgroundColor: colors.surface,
                    height: keyboardHeight,
                    paddingBottom: insets.bottom,
                  },
                ]}
              />
            </View>
          ) : null}

          {/* Composer: hidden when search mode is active */}
          {!searchMode && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.surfaceVariant,
                backgroundColor: colors.surface,
              }}
            >
              <View 
                className="px-4 flex-row items-center" 
                style={{
                  paddingBottom: 4,
                  paddingTop: 4,
                }}
              >
                <TouchableOpacity className="mr-3">
                  <MaterialIcons name="emoji-emotions" size={26} color={colors.icon} />
                </TouchableOpacity>

                <View 
                  className="flex-1 px-2 py-2 mr-3" 
                  style={{ 
                    backgroundColor: colors.surface, 
                    borderRadius: 10, 
                    minHeight: 48, 
                    justifyContent: 'center' 
                  }}
                >
                  <TextInput
                    ref={inputRef}
                    value={messageText}
                    onChangeText={text => setMessageText(text)}
                    placeholder="Tin nhắn"
                    placeholderTextColor={colors.textSecondary}
                    style={{ color: colors.text, fontSize: 16, paddingVertical: 6 }}
                    onFocus={() => setComposerVisible(false)}
                  />
                </View>

                {/* Right action icons: show send when typing, otherwise more/mic/image */}
                <View className="flex-row items-center">
                  {messageText.trim().length > 0 ? (
                    <TouchableOpacity 
                      onPress={() => { 
                        console.log('Send:', messageText); 
                        setMessageText(''); 
                        inputRef.current?.blur?.(); 
                        Keyboard.dismiss(); 
                      }} 
                      style={{ padding: 6 }}
                    >
                      <MaterialIcons name="send" size={34} color={colors.tint} />
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity 
                        className="mr-4" 
                        onPress={() => { 
                          inputRef.current?.blur?.(); 
                          Keyboard.dismiss(); 
                          setComposerVisible(v => !v); 
                        }} 
                        style={{ padding: 6 }}
                      >
                        <MaterialIcons 
                          name="more-horiz" 
                          size={24} 
                          color={composerVisible ? colors.tint : colors.icon} 
                        />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        className="mr-4" 
                        onPress={() => console.log('Mic pressed')} 
                        style={{ padding: 6 }}
                      >
                        <MaterialIcons name="mic" size={28} color={colors.icon} />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        onPress={() => console.log('Image pressed')} 
                        style={{ padding: 6 }}
                      >
                        <MaterialIcons name="image" size={26} color={colors.icon} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {/* Animated spacer that grows with keyboard height - pushes content up naturally */}
              <Animated.View
                style={[
                  { 
                    backgroundColor: colors.surface,
                    height: keyboardHeight,
                    paddingBottom: insets.bottom,
                  },
                ]}
              />
            </View>
          )}

          {composerVisible && (
            <ComposerActionsSheet
              inline
              visible={composerVisible}
              onClose={() => setComposerVisible(false)}
              onAction={(key) => { 
                console.log('Composer action:', key); 
                setComposerVisible(false); 
              }}
            />
          )}

        </View>
      </View>
    </SafeAreaView>
  );
}