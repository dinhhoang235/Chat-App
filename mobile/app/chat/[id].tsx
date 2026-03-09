import React from 'react';
import { View, FlatList, ActivityIndicator, Image, TouchableOpacity, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { Header } from '../../components/Header';
import InThreadSearch from '../../components/InThreadSearch';
import MessageBubble from '../../components/MessageBubble';
import ComposerActionsSheet from '../../components/ComposerActionsSheet';
import ChatComposer from '../../components/ChatComposer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TypingDots } from '../../components/TypingDots';
import { useChatThread } from '../../hooks/useChatThread';
import { ChatAvatar } from '../../components/ChatAvatar';

export default function ChatThread() {
  const {
    colors,
    params,
    router,
    id,
    paramName,
    targetUserId,
    targetUserIdState,
    messages,
    loading,
    loadingMore,
    hasMore,
    creatingConversation,
    isTyping,
    displayTypingAvatar,
    flatListRef,
    inputRef,
    searchMode,
    setSearchMode,
    searchQuery,
    setSearchQuery,
    resultIndices,
    currentResultIndex,
    setCurrentResultIndex,
    composerVisible,
    setComposerVisible,
    messageText,
    onTextChange,
    insets,
    animatedContentStyle,
    fetchMessages,
    handleSend,
    targetUserStatus,
    targetUser,
  } = useChatThread();

  const getStatusText = () => {
    if (!targetUserStatus) return null;
    if (targetUserStatus.status === 'online') return 'Đang hoạt động';
    if (targetUserStatus.lastSeen) {
      const diff = Math.floor((Date.now() - targetUserStatus.lastSeen) / 60000);
      if (diff < 1) return 'Hoạt động vừa xong';
      if (diff < 60) return `Hoạt động ${diff} phút trước`;
      const hours = Math.floor(diff / 60);
      if (hours < 24) return `Hoạt động ${hours} giờ trước`;
      return `Hoạt động ${Math.floor(hours / 24)} ngày trước`;
    }
    return null;
  };

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
              showBack
              leftElement={
                <TouchableOpacity 
                  onPress={() => {
                    const finalTargetUserId = targetUserIdState;
                    if (finalTargetUserId) {
                      router.push(`/profile/${finalTargetUserId}`);
                    }
                  }}
                  activeOpacity={1}
                  className="flex-row items-center"
                >
                  <ChatAvatar
                    avatar={targetUser?.avatar || (params.avatar as string)}
                    name={paramName || targetUser?.fullName}
                    online={targetUserStatus?.status === 'online'}
                    size={44}
                    tintColor={colors.tint}
                    borderColor={colors.header}
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                      {paramName || targetUser?.fullName || 'Chat'}
                    </Text>
                    {getStatusText() && (
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>
                        {getStatusText()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              }
              onBackPress={() => router.back()}
              rightActions={[
                { icon: 'call', onPress: () => console.log('Call pressed') },
                { icon: 'videocam', onPress: () => console.log('Video call pressed') },
                { 
                  icon: 'more-vert', 
                  onPress: () => router.push({
                    pathname: '/chat/[id]/options',
                    params: { 
                      id,
                      name: paramName || targetUser?.fullName, 
                      avatar: targetUser?.avatar || params.avatar,
                      targetUserId: targetUserId,
                      status: targetUserStatus?.status
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
                  ListHeaderComponent={() => isTyping ? (
                    <View className="px-4 py-2 flex-row items-center">
                      <Image 
                        source={{ uri: displayTypingAvatar }} 
                        className="w-10 h-10 rounded-full mr-3"
                        style={{ backgroundColor: colors.surfaceVariant }}
                      />
                      <View 
                        style={{ 
                          backgroundColor: colors.bubbleOther,
                          borderWidth: 1,
                          borderColor: colors.surfaceVariant,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 18
                        }}
                      >
                        <TypingDots />
                      </View>
                    </View>
                  ) : null}
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
              <ChatComposer
                messageText={messageText}
                onTextChange={onTextChange}
                inputRef={inputRef}
                handleSend={handleSend}
                creatingConversation={creatingConversation}
                composerVisible={composerVisible}
                setComposerVisible={setComposerVisible}
                colors={colors}
                insets={insets}
              />
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