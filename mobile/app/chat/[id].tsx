import React from 'react';
import { View, FlatList, ActivityIndicator, Image, TouchableOpacity, Text, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { Header } from '../../components/Header';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import InThreadSearch from '../../components/InThreadSearch';
import MessageBubble from '../../components/MessageBubble';
import ComposerActionsSheet from '../../components/ComposerActionsSheet';
import ChatComposer from '../../components/ChatComposer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TypingDots } from '../../components/TypingDots';
import { useChatThread } from '../../hooks/useChatThread';
import { ChatAvatar } from '../../components/ChatAvatar';
import { GroupAvatar } from '../../components/GroupAvatar';

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
    handleSendAttachment,
    targetUserStatus,
    targetUser,
    isGroup,
    groupAvatars,
    membersCount
  } = useChatThread();

  const pickImageFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert('Permission required', 'Please allow access to your photos.');
        return;
      }
      const result: any = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsMultipleSelection: false,
      });
      // new API returns { canceled: boolean; assets: Asset[] }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const name = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(name);
        const type = match ? `image/${match[1]}` : asset.type || 'image/jpeg';
        handleSendAttachment({ uri, name, type });
      }
    } catch (err) {
      console.error('Image picker error', err);
    }
  };

  const pickDocument = async () => {
    try {
      const res: any = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      // handle both legacy and new expo-document-picker shapes
      let uri: string | undefined;
      let name: string | undefined;
      let mime: string | undefined;
      let size: number | undefined;

      if (res.uri) {
        uri = res.uri;
        name = res.name;
        mime = res.mimeType;
        size = res.size;
      } else if (res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        uri = asset.uri;
        name = asset.name;
        mime = asset.mimeType;
        size = asset.size;
      }

      if (uri) {
        if (size && size > 5 * 1024 * 1024) {
          Alert.alert('File too large', 'Please select a file smaller than 5MB.');
          return;
        }
        handleSendAttachment({ uri, name: name || 'file', type: mime || 'application/octet-stream', size });
      } else {
        console.log('Document picker returned no uri, result:', res);
      }
    } catch (err) {
      console.error('Document picker error', err);
    }
  };

  const getStatusText = () => {
    if (isGroup) return null;
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
                    if (isGroup) {
                      router.push({
                        pathname: '/chat/[id]/options',
                        params: { 
                          id,
                          name: paramName || targetUser?.fullName, 
                          avatar: targetUser?.avatar || params.avatar,
                          targetUserId: targetUserId,
                          status: targetUserStatus?.status,
                          isGroup: 'true',
                          membersCount: membersCount,
                          avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars
                        }
                      } as any);
                    } else if (finalTargetUserId) {
                      router.push(`/profile/${finalTargetUserId}`);
                    }
                  }}
                  activeOpacity={1}
                  className="flex-row items-center"
                >
                  {isGroup ? (
                    <GroupAvatar 
                      avatars={groupAvatars} 
                      size={44} 
                      membersCount={membersCount} 
                    />
                  ) : (
                    <ChatAvatar
                      avatar={targetUser?.avatar || (params.avatar as string)}
                      name={paramName || targetUser?.fullName}
                      online={!isGroup && targetUserStatus?.status === 'online'}
                      size={44}
                      tintColor={colors.tint}
                      borderColor={colors.header}
                    />
                  )}
                  <View style={{ marginLeft: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                      {paramName || targetUser?.fullName || 'Chat'}
                    </Text>
                    {isGroup ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>
                        {membersCount} thành viên
                      </Text>
                    ) : getStatusText() && (
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
                      status: targetUserStatus?.status,
                      isGroup: isGroup ? 'true' : 'false',
                      membersCount: membersCount,
                      avatars: Array.isArray(groupAvatars) ? groupAvatars.join(',') : groupAvatars
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
                onImagePress={pickImageFromLibrary}
              />
            )}
          </Animated.View>

          {composerVisible && (
            <ComposerActionsSheet
              inline
              visible={composerVisible}
              onClose={() => setComposerVisible(false)}
              onAction={(key) => {
                console.log('composer action selected', key);
                setComposerVisible(false);
                if (key === 'document') {
                  pickDocument();
                } else if (key === 'location') {
                  // TODO: implement location share
                } else if (key === 'gif') {
                  // TODO: open GIF picker
                } else {
                  console.log('Composer action:', key);
                }
              }}
            />
          )}

        </View>
      </View>
    </SafeAreaView>
  );
}