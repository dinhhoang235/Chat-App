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
import { API_URL } from '../../services/api';

export default function ChatThread() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = (params.id as string) === 'new' ? null : params.id as string;
  const targetUserId = params.targetUserId as string;
  const paramName = params.name as string | undefined;
  // isNewConversation khi navigate từ /chat/new hoặc khi chưa có conversation id
  const isNewConversation = (!id || id === 'new') && !!targetUserId;

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNewConversation);
  const [conversationId, setConversationId] = useState<string | null>(id || null);
  const [targetUserIdState, setTargetUserIdState] = useState<string | null>(targetUserId || (params.targetUserId as string) || null);
  const [creatingConversation, setCreatingConversation] = useState(false);

  // If we are in 'new' mode, we should still check if a conversation actually exists
  // but we won't show the loading spinner to the user.
  useEffect(() => {
    const checkExisting = async () => {
      if (isNewConversation && targetUserIdState && !conversationId) {
        try {
          const response = await chatApi.startConversation(Number(targetUserIdState));
          const conv = response.data;
          const convId = conv.id || conv.conversationId;
          
          if (convId && conv.messages && conv.messages.length > 0) {
            // If it exists AND has messages, switch to regular mode
            setConversationId(convId.toString());
          }
        } catch {
          console.log("No existing conversation found yet, sticking with 'new' mode");
        }
      }
    };
    checkExisting();
  }, [isNewConversation, targetUserIdState, conversationId]);

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
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contactName: m.sender?.fullName,
        contactAvatar: m.sender?.avatar ? `${API_URL}${m.sender.avatar}` : undefined
      }));

      // If we still don't have targetUserId, extract it from the messages
      if (!targetUserIdState && mapped.length > 0) {
        const otherMessage = mapped.find((m: any) => m.senderId !== user?.id);
        if (otherMessage) {
          setTargetUserIdState(otherMessage.senderId.toString());
        }
      }

      setMessages(mapped);
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id, targetUserIdState]);

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
      setMessages(prev => {
        // Prevent duplicate messages if already in state
        if (prev.find(m => m.id === message.id)) return prev;
        
        return [...prev, {
          ...message,
          fromMe: message.senderId === userId,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contactName: message.sender?.fullName,
          contactAvatar: message.sender?.avatar ? `${API_URL}${message.sender.avatar}` : undefined
        }];
      });
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

      // If this is a new conversation, create it with the first message
      if (isNewConversation && !conversationId) {
        setCreatingConversation(true);
        try {
          const response = await chatApi.startConversation(Number(targetUserIdState), text);
          const conv = response.data;
          targetConversationId = conv.id || conv.conversationId;
          
          if (targetConversationId) {
            setConversationId(targetConversationId.toString());
            // Clear 'new' state since it's now a real conversation
            // The message is already created by startConversation
            const lastMessage = conv.messages?.[0];
            if (lastMessage) {
              setMessages([{
                ...lastMessage,
                fromMe: true,
                time: new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }]);
            }
          }
          return; // Message is already sent as part of startConversation
        } catch (err) {
          console.error("Error creating conversation on send:", err);
          setMessageText(text);
          return;
        } finally {
          setCreatingConversation(false);
        }
      }

      await chatApi.sendMessage(Number(targetConversationId), text);
      
      // Socket.io will handle appending the message for both sender and receiver.
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("Send error:", err);
      setMessageText(text); // Restore text if error
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
                const finalTargetUserId = targetUserIdState;
                if (finalTargetUserId) {
                  router.push(`/profile/${finalTargetUserId}`);
                }
              }}
              rightActions={[
                { icon: 'call', onPress: () => console.log('Call pressed') },
                { icon: 'videocam', onPress: () => console.log('Video call pressed') },
                { 
                  icon: 'more-vert', 
                  onPress: () => router.push({
                    pathname: '/chat/[id]/options',
                    params: { 
                      id,
                      name: paramName, 
                      avatar: params.avatar,
                      targetUserId: targetUserId
                    }
                  } as any) 
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