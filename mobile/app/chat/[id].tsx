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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(id || null);
  const [targetUserIdState, setTargetUserIdState] = useState<string | null>(targetUserId || (params.targetUserId as string) || null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const messagesRef = useRef<any[]>([]);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  // Reset state when conversation changes
  useEffect(() => {
    setInitialFetchDone(false);
    setHasMore(true);
    setMessages([]);
    if (conversationId) setLoading(true);
  }, [conversationId]);

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

  const animatedContentStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(0, keyboardHeight.value - insets.bottom / 2),
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

  const fetchMessages = useCallback(async (isLoadMore = false) => {
    if (!conversationId) return;
    if (isLoadMore && (!hasMore || loadingMore)) return;

    try {
      if (isLoadMore) setLoadingMore(true);
      
      const cursor = isLoadMore && messagesRef.current.length > 0 
        ? messagesRef.current[messagesRef.current.length - 1].id 
        : undefined;

      const response = await chatApi.getMessages(Number(conversationId), cursor, 20);
      const newMessages = response.data;

      const mapped = newMessages.map((m: any) => ({
        ...m,
        fromMe: m.senderId === user?.id,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contactName: m.sender?.fullName,
        contactAvatar: m.sender?.avatar ? `${API_URL}${m.sender.avatar}` : undefined,
        seenBy: m.seenBy || []
      }));

      if (isLoadMore) {
        setMessages(prev => [...prev, ...mapped]);
      } else {
        setMessages(mapped);
        setInitialFetchDone(true);
      }

      setHasMore(newMessages.length === 20);
      
      // If we still don't have targetUserId, extract it from the messages
      if (!targetUserIdState && mapped.length > 0) {
        const otherMessage = mapped.find((m: any) => m.senderId !== user?.id);
        if (otherMessage) {
          setTargetUserIdState(otherMessage.senderId.toString());
        }
      }
    } catch (err) {
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, user?.id, hasMore, loadingMore, targetUserIdState]);

  useEffect(() => {
    if (!isFocused || !conversationId || initialFetchDone) return;
    
    fetchMessages(false);

    const conversationIdNum = parseInt(conversationId, 10);
    socketService.emit('join_conversation', conversationIdNum);
  }, [conversationId, isFocused, fetchMessages, initialFetchDone]);

  useEffect(() => {
    if (!isFocused) return;
    
    const conversationIdNum = conversationId ? parseInt(conversationId, 10) : null;

    // Listen for seen events
    const handleMessageSeen = (data: any) => {
      const { userId: seenByUserId, seenAt, user: seenUser } = data;
      if (seenByUserId === user?.id) return;

      const userData = seenUser || { 
        id: seenByUserId, 
        fullName: 'User', 
        avatar: undefined 
      };

      setMessages(prev => prev.map(m => {
        if (new Date(m.createdAt) <= new Date(seenAt)) {
          const alreadySeen = m.seenBy?.some((u: any) => u.id === seenByUserId);
          if (!alreadySeen && m.senderId !== seenByUserId) {
            return {
              ...m,
              seenBy: [...(m.seenBy || []), userData]
            };
          }
        }
        return m;
      }));
    };

    socketService.on('message_seen', handleMessageSeen);

    const userId = user?.id;

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      setMessages(prev => {
        const isDuplicate = prev.find(m => m.id === message.id);
        if (isDuplicate) return prev;

        const tempIdx = prev.findIndex(m => m.status === 'sending' && m.content === message.content && m.senderId === message.senderId);
        
        const mappedMessage = {
          ...message,
          fromMe: message.senderId === userId,
          time: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contactName: message.sender?.fullName,
          contactAvatar: message.sender?.avatar ? `${API_URL}${message.sender.avatar}` : undefined,
          seenBy: message.seenBy || [],
          status: 'sent'
        };

        if (tempIdx !== -1) {
          const newMessages = [...prev];
          newMessages[tempIdx] = mappedMessage;
          return newMessages;
        }
        
        return [mappedMessage, ...prev];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    };

    socketService.on('new_message', handleNewMessage);

    return () => {
      if (conversationIdNum) socketService.emit('leave_conversation', conversationIdNum);
      socketService.off('new_message');
      socketService.off('message_seen');
    };
  }, [conversationId, user?.id, isFocused]);

  const handleSend = async () => {
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');

    // Scroll to bottom (index 0 in inverted list)
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: text,
      fromMe: true,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    };

    try {
      let targetConversationId = conversationId;

      // If this is a new conversation, create it with the first message
      if (isNewConversation && !conversationId) {
        setMessages([tempMessage]);
        setCreatingConversation(true);
        try {
          const response = await chatApi.startConversation(Number(targetUserIdState), text);
          const conv = response.data;
          targetConversationId = conv.id || conv.conversationId;
          
          if (targetConversationId) {
            setConversationId(targetConversationId.toString());
            const lastMessage = conv.messages?.[0];
            if (lastMessage) {
              setMessages([{
                ...lastMessage,
                fromMe: true,
                time: new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'sent'
              }]);
            }
          }
          return;
        } catch (err) {
          console.error("Error creating conversation on send:", err);
          setMessages([]);
          setMessageText(text);
          return;
        } finally {
          setCreatingConversation(false);
        }
      }

      setMessages(prev => [tempMessage, ...prev]);

      await chatApi.sendMessage(Number(targetConversationId), text);
      
      // We don't manually set 'sent' here because the socket 'new_message' 
      // will arrive and replace this temp message or add the real one.
    } catch (err) {
      console.error("Send error:", err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
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

          {/* Wrapper for messages and composer that pushes up with keyboard */}
          <Animated.View style={[{ flex: 1 }, animatedContentStyle]}>
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : (
              <View style={{ flex: 1, marginBottom: 2 }}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  inverted
                  keyExtractor={(i) => i.id.toString()}
                  initialNumToRender={20}
                  maxToRenderPerBatch={20}
                  windowSize={10}
                  maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10,
                  }}
                  contentContainerStyle={{ 
                    paddingVertical: 12,
                    paddingBottom: 0
                  }}
                  onEndReached={() => {
                    if (hasMore && !loadingMore && messages.length >= 10) {
                      fetchMessages(true);
                    }
                  }}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={() => loadingMore ? (
                    <ActivityIndicator style={{ marginVertical: 10 }} color={colors.tint} />
                  ) : null}
                  renderItem={({ item, index }: any) => {
                    const nextMessage = messages[index - 1]; // Inverted list: index 0 is at bottom (newest)
                    // If message above (index-1) is from same user, this is NOT the last in that user's consecutive group
                    const isLastInConsecutiveGroup = !nextMessage || nextMessage.senderId !== item.senderId;
                    
                    // For 'seen' status: index 0 is the newest message
                    const isThreadLast = index === 0;

                    return (
                      <MessageBubble 
                        message={item} 
                        highlightQuery={searchQuery} 
                        isLastInGroup={isLastInConsecutiveGroup}
                        isThreadLast={isThreadLast}
                        onPress={() => { if (composerVisible) setComposerVisible(false); }} 
                        onAvatarPress={() => {
                          if (item.fromMe) return router.push('/profile/me');
                          router.push(`/profile/${item.senderId}`);
                        }}
                      />
                    );
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
              </View>
            ) : null}

            {/* Composer: hidden when search mode is active */}
            {!searchMode && (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.surfaceVariant,
                  backgroundColor: colors.surface,
                  marginTop: -8, // Kéo composer lên sát hơn với tin nhắn
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

                {/* Return to using a small spacer or insets for default state */}
                <View style={{ height: insets.bottom / 2 }} />
              </View>
            )}
          </Animated.View>

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