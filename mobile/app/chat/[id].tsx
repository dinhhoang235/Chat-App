import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, Keyboard, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
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
import { chatApi } from '../../services/chat';
import { socketService } from '../../services/socket';
import { useAuth } from '../../context/authContext';

export default function ChatThread() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const targetUserId = params.targetUserId as string;
  const paramName = params.name as string | undefined;
  // isNewConversation khi navigate từ /chat/new hoặc khi chưa có conversation id
  const isNewConversation = (id === 'new' || !id) && !!targetUserId;

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNewConversation);
  const [conversationId, setConversationId] = useState<string | null>(id || null);
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Search mode toggled by Options or header
  const initialSearch = !!(params as any).search;
  const [searchMode, setSearchMode] = useState<boolean>(initialSearch);
  const flatListRef = useRef<FlatList>(null);

  // lifted search state
  const [searchQuery, setSearchQuery] = useState('');
  const [resultIndices] = useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const [composerVisible, setComposerVisible] = useState(false);
  const inputRef = useRef<any>(null);
  const [messageText, setMessageText] = useState('');

  const insets = useSafeAreaInsets();

  // Listen to SearchContext open events to avoid navigation flicker
  const { openFor, close } = useSearch();
  const isFocused = useIsFocused();
  const [pendingOpen, setPendingOpen] = useState(false);

  const keyboardHeight = useSharedValue(0);
  const listPaddingBottom = insets.bottom + 64;

  const animatedSpacerStyle = useAnimatedStyle(() => ({
    height: keyboardHeight.value,
  }));

  useKeyboardHandler({
    onStart: (event) => {
      'worklet';
      keyboardHeight.value = event.height;
    },
    onMove: (event) => {
      'worklet';
      keyboardHeight.value = event.height;
    },
    onEnd: (event) => {
      'worklet';
      keyboardHeight.value = event.height;
    },
  });

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await chatApi.getMessages(conversationId);
      const mapped = response.data.map((m: any) => ({
        ...m,
        fromMe: m.senderId === user?.id,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(mapped);
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (!isFocused) return;
    
    fetchMessages();

    // Join room (only if conversation exists)
    if (!conversationId) return;
    
    const conversationIdNum = parseInt(conversationId, 10);
    socketService.emit('join_conversation', conversationIdNum);

    const userId = user?.id;

    // Listen for new messages
    socketService.on('new_message', (message) => {
      setMessages(prev => [...prev, {
        ...message,
        fromMe: message.senderId === userId,
        time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      socketService.emit('leave_conversation', conversationIdNum);
      socketService.off('new_message');
    };
  }, [conversationId, fetchMessages, user?.id, isFocused]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');

    try {
      let targetConversationId = conversationId;

      // If this is a new conversation, create it first
      if (isNewConversation && !conversationId) {
        setCreatingConversation(true);
        const response = await chatApi.startConversation(Number(targetUserId));
        targetConversationId = response.data?.id || response.data?.conversationId;
        
        if (!targetConversationId) {
          console.error("Failed to create conversation");
          setMessageText(text);
          setCreatingConversation(false);
          return;
        }

        setConversationId(targetConversationId);
        setCreatingConversation(false);
      }

      // Send the message
      if (!targetConversationId) {
        console.error("No conversation ID available");
        setMessageText(text);
        return;
      }

      await chatApi.sendMessage(targetConversationId, text);

      // Join the conversation room if it's new
      if (isNewConversation) {
        socketService.emit('join_conversation', parseInt(targetConversationId, 10));
      }
    } catch (err) {
      console.error("Send message error:", err);
      setMessageText(text);
    }
  };

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
              title={paramName || 'Chat'}
              showBack
              onBackPress={() => router.back()}
              onTitlePress={() => {
                if (isNewConversation) {
                  router.push(`/profile/${targetUserId}`);
                } else {
                  // If it's an existing conversation, we might need more logic 
                  // to find the target user ID if it's a 1-1 chat.
                  // For now, if targetUserId exists in params, we use it.
                  if (targetUserId) {
                    router.push(`/profile/${targetUserId}`);
                  }
                }
              }}
              rightActions={[
                { icon: 'call', onPress: () => console.log('Call pressed') },
                { icon: 'videocam', onPress: () => console.log('Video call pressed') },
                { 
                  icon: 'more-vert', 
                  onPress: () => router.push({
                    pathname: `/chat/${id}/options`,
                    params: { 
                      name: paramName, 
                      avatar: params.avatar,
                      targetUserId: targetUserId
                    }
                  }) 
                },
              ]}
            />
          )}

          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(i) => i.id.toString()}
                renderItem={({ item }: any) => (
                  <MessageBubble 
                    message={item} 
                    highlightQuery={searchQuery} 
                    onPress={() => { if (composerVisible) setComposerVisible(false); }} 
                    onAvatarPress={() => {
                      if (item.fromMe) return router.push('/profile/me');
                      router.push(`/profile/${item.senderId}`);
                    }}
                  />
                )}
                contentContainerStyle={{ 
                  paddingVertical: 12,
                  paddingBottom: listPaddingBottom
                }}
              />
            </View>
          )}

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
                messages={messages as any}
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
                    paddingBottom: insets.bottom,
                  },
                  animatedSpacerStyle,
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
                    minHeight: 40,
                    maxHeight: 100,
                    justifyContent: 'center' 
                  }}
                >
                  <TextInput
                    ref={inputRef}
                    value={messageText}
                    onChangeText={text => setMessageText(text)}
                    placeholder="Tin nhắn"
                    placeholderTextColor={colors.textSecondary}
                    style={{ 
                      color: colors.text, 
                      fontSize: 16, 
                      paddingVertical: 8,
                      textAlignVertical: 'center'
                    }}
                    multiline
                    onFocus={() => setComposerVisible(false)}
                  />
                </View>

                {/* Right action icons: show send when typing, otherwise more/mic/image */}
                <View className="flex-row items-center">
                  {messageText.trim().length > 0 ? (
                    <TouchableOpacity 
                      onPress={handleSend}
                      disabled={creatingConversation}
                      style={{ padding: 6, opacity: creatingConversation ? 0.5 : 1 }}
                    >
                      {creatingConversation ? (
                        <ActivityIndicator size={28} color={colors.tint} />
                      ) : (
                        <MaterialIcons name="send" size={34} color={colors.tint} />
                      )}
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
                    paddingBottom: insets.bottom,
                  },
                  animatedSpacerStyle,
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