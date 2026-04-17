import React from 'react';
import { View, FlatList, ActivityIndicator, Image, TouchableOpacity, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { Header, GallerySheet, EmojiSheet, TypingDots, ChatAvatar, GroupAvatar, InThreadSearch, MessageBubble, ComposerActionsSheet, ComposerMicSheet, ChatComposer, GroupVideoCallModal } from '@/components';
import useSheetControl from '@/hooks/useSheetControl';
import { useChatThread } from '@/hooks/useChatThread';
import { useGroupCallAction } from '@/hooks/useGroupCallAction';
import { useCall } from '@/context/callContext';
import { socketService } from '@/services/socket';

export default function ChatThread() {
  const DEFAULT_COMPOSER_HEIGHT = 74;
  const [micTextMode, setMicTextMode] = React.useState(false);
  const [micOutsideCloseLocked, setMicOutsideCloseLocked] = React.useState(false);
  const [micVoiceFlowActive, setMicVoiceFlowActive] = React.useState(false);
  const [groupVideoCallVisible, setGroupVideoCallVisible] = React.useState(false);
  const [composerHeight, setComposerHeight] = React.useState(DEFAULT_COMPOSER_HEIGHT);
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
    currentResultIndex,
    setCurrentResultIndex,
    composerVisible,
    setComposerVisible,
    galleryVisible,
    setGalleryVisible,
    emojiVisible,
    setEmojiVisible,
    micVisible,
    setMicVisible,
    messageText,
    onTextChange,
    handleEmojiSelect,
    handleBackspace,
    insets,
    animatedContentStyle,
    fetchMessages,
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    targetUserStatus,
    targetUser,
    isGroup,
    groupAvatars,
    membersCount,
    lastKeyboardHeight,
    processedMessages,
    currentResultIndices,
    statusText,
    handleSend,
    sendTextDirect,
    handleSendAttachment,
    pickDocument,
    replyingTo,
    setReplyingTo,
    highlightedMessageId,
    scrollToMessageId,
    uploadProgress,
    startVoiceCall,
    startVideoCall,
    startGroupVideoCall,
    handleGroupVideoHeaderPress,
    allMedia
  } = useChatThread({
    openGroupVideoCallModal: React.useCallback(() => {
      setGroupVideoCallVisible(true);
    }, []),
  });
  const { activeCall, callStatus } = useCall();
  const [remoteActiveGroupCall, setRemoteActiveGroupCall] = React.useState(false);

  const activeCallConversationId = activeCall?.conversationId;
  const activeCallGroupSize =
    activeCall?.targetUserIds?.length ??
    Math.max(0, (activeCall?.groupTargets?.length ?? 0) - 1);
  const isActiveGroupCall = Boolean(
    (activeCallConversationId != null &&
      String(activeCallConversationId) === String(id) &&
      activeCall?.callType === 'video' &&
      activeCallGroupSize > 1 &&
      callStatus !== 'ended') || remoteActiveGroupCall
  );

  const handleCallAction = useGroupCallAction(() => setGroupVideoCallVisible(true));

  React.useEffect(() => {
    let mounted = true;
    const checkGroupCall = async () => {
      if (!isGroup || !id) {
        if (mounted) setRemoteActiveGroupCall(false);
        return;
      }

      try {
        const response = await new Promise<any>((resolve) => {
          socketService.emit('query_active_call', { conversationId: id }, (res: any) => {
            resolve(res);
          });
        });
        const info = response?.callInfo;
        const isRemoteActive = Boolean(
          info?.callType === 'video' &&
          (info?.invitedUserIds?.length ?? 0) > 1 &&
          response?.callId
        );
        if (mounted) setRemoteActiveGroupCall(isRemoteActive);
      } catch {
        if (mounted) setRemoteActiveGroupCall(false);
      }
    };

    checkGroupCall();

    return () => {
      mounted = false;
    };
  }, [id, isGroup]);

  // unified sheet control (gallery/composer) moved to hook
  const { openSheet, closeAll, sheetHeight } = useSheetControl(
    inputRef,
    composerVisible,
    setComposerVisible,
    galleryVisible,
    setGalleryVisible,
    emojiVisible,
    setEmojiVisible,
    micVisible,
    setMicVisible,
    lastKeyboardHeight
  );

  const renderItem = React.useCallback(({ item, index }: any) => {
    if (item.type === 'date_separator') {
      return (
        <View className="items-center my-4">
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
            {item.date}
          </Text>
        </View>
      );
    }

    const nextMessage = processedMessages[index - 1]; 
    const isLastInConsecutiveGroup = !nextMessage || nextMessage.senderId !== item.senderId;
    const isThreadLast = index === 0;

    return (
      <MessageBubble
        message={item}
        highlightQuery={searchQuery}
        isLastInGroup={isLastInConsecutiveGroup}
        isThreadLast={isThreadLast}
        onPress={() => { if (composerVisible) closeAll(); }}
        onAvatarPress={() => {
          if (item.fromMe) return router.push('/profile/me');
          router.push(`/profile/${item.senderId}`);
        }}
        onReply={() => setReplyingTo(item)}
        isHighlighted={item.id?.toString() === highlightedMessageId}
        onReplyPress={(replyId: string) => scrollToMessageId(replyId)}
        progress={uploadProgress[item.id]}
        allMedia={allMedia}
        onVoiceCall={startVoiceCall}
        onVideoCall={startVideoCall}
        onCallAction={handleCallAction}
        isGroupThread={isGroup}
      />
    );
  }, [processedMessages, colors, searchQuery, composerVisible, router, highlightedMessageId, uploadProgress, closeAll, setReplyingTo, scrollToMessageId, allMedia, startVoiceCall, startVideoCall, handleCallAction, isGroup]);

  const maybeCloseAll = React.useCallback(() => {
    if (micOutsideCloseLocked) return;
    closeAll();
  }, [micOutsideCloseLocked, closeAll]);

  const micSheetHeight = micVoiceFlowActive
    ? Math.round(sheetHeight + composerHeight)
    : sheetHeight;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1 }} >
          {searchMode ? (
            // header replaced by search header
            <InThreadSearch
              query={searchQuery}
              onQueryChange={setSearchQuery}
              resultIndices={currentResultIndices}
              currentResultIndex={currentResultIndex}
              onSetCurrentResultIndex={setCurrentResultIndex}
              onClose={() => setSearchMode(false)}
              onScrollToMessage={(idx) => flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5 })}
              renderMode="header"
            />
          ) : (
            <View onTouchStart={maybeCloseAll}>
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
                      borderColor={colors.header}
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
                    ) : statusText && (
                      <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: -2 }} numberOfLines={1}>
                        {statusText}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              }
              onBackPress={() => router.back()}
              rightActions={isGroup ? [
                { icon: 'video', onPress: handleGroupVideoHeaderPress, active: isActiveGroupCall },
                { icon: 'search', onPress: () => setSearchMode(true) },
                {
                  icon: 'bars',
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
              ] : [
                { icon: 'call-outline', onPress: startVoiceCall },
                { icon: 'video', onPress: startVideoCall },
                {
                  icon: 'bars',
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
            </View>
          )}

          {isGroup && id && (
            <GroupVideoCallModal
              visible={groupVideoCallVisible}
              conversationId={id}
              onClose={() => setGroupVideoCallVisible(false)}
              onStart={(selectedMembers) => {
                startGroupVideoCall(selectedMembers);
              }}
            />
          )}

          {/* Wrapper for messages and composer that pushes up with keyboard */}
            <Animated.View style={[{ flex: 1 }, animatedContentStyle]}>
              {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.tint} />
                </View>
              ) : (
                <View
                  style={{ flex: 1, marginBottom: 2 }}
                  onTouchStart={maybeCloseAll}
                >
                  <FlatList
                    ref={flatListRef}
                    data={processedMessages}
                    inverted
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    keyExtractor={(i, idx) => {
                      // prefer stable id when available, convert to string
                      if (i.id != null && i.id.toString() !== '') {
                        return i.id.toString();
                      }
                      // fallback for messages without an id – include index to
                      // guarantee uniqueness in this render cycle. ideally this
                      // never occurs but it prevents duplicate-key errors when
                      // the backend returns a message with a missing id.
                      return `msg-${idx}`;
                    }}
                    initialNumToRender={20}
                    maxToRenderPerBatch={40}
                    windowSize={21}
                    maintainVisibleContentPosition={{
                      minIndexForVisible: 0,
                      autoscrollToTopThreshold: 10,
                    }}
                    contentContainerStyle={{
                      paddingVertical: 12,
                      paddingBottom: 0
                    }}
                    onEndReached={() => {
                      if (hasMore && !loadingMore) {
                        fetchMessages(true);
                      }
                    }}
                    ListHeaderComponent={() => isTyping ? (
                      <View className="px-4 py-2 flex-row items-center">
                        <Image
                          source={displayTypingAvatar ? { uri: displayTypingAvatar } : undefined}
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
                    onEndReachedThreshold={0.5}
                    renderItem={renderItem}
                  />
                </View>
              )}

              {/* Bottom search bar: replace composer when in searchMode */}
              {searchMode && (
                <InThreadSearch
                  messages={messages as any}
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  resultIndices={currentResultIndices}
                  currentResultIndex={currentResultIndex}
                  onSetCurrentResultIndex={setCurrentResultIndex}
                  onClose={() => setSearchMode(false)}
                  onScrollToMessage={(idx) => flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5 })}
                  renderMode="bottom"
                />
              )}

              {/* Composer: hidden when search mode is active */}
              {!searchMode && !micVoiceFlowActive && (
                <View
                  onLayout={(event) => {
                    const nextHeight = Math.round(event.nativeEvent.layout.height || 0);
                    if (nextHeight > 0 && Math.abs(nextHeight - composerHeight) > 1) {
                      setComposerHeight(nextHeight);
                    }
                  }}
                >
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
                    onOpenSheet={openSheet}
                    micTextMode={micTextMode}
                    imageActive={galleryVisible ? 'gallery' : (emojiVisible ? 'emoji' : (micVisible ? 'mic' : (composerVisible ? 'actions' : false)))}
                    attachments={attachments}
                    onRemoveAttachment={removeAttachment}
                    onClearAttachments={clearAttachments}
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    onFocus={() => {
                      if (galleryVisible) setGalleryVisible(false);
                      if (composerVisible) setComposerVisible(false);
                      if (emojiVisible) setEmojiVisible(false);
                      if (micVisible) setMicVisible(false);
                    }}
                  />
                </View>
              )}
          </Animated.View>

          <GallerySheet
            visible={galleryVisible}
            onClose={() => {
              setGalleryVisible(false);
              clearAttachments();
            }}
            attachments={attachments}
            addAttachment={(file: any) => addAttachments([file])}
            removeAttachment={removeAttachment}
            height={sheetHeight}
          />

          <EmojiSheet
            visible={emojiVisible}
            onClose={() => setEmojiVisible(false)}
            onEmojiSelected={(emoji) => {
              handleEmojiSelect(emoji.emoji);
            }}
            onBackspacePress={handleBackspace}
            height={sheetHeight}
          />

          <ComposerActionsSheet
            visible={composerVisible}
            onClose={() => {
              setComposerVisible(false);
            }}
            height={sheetHeight}
            onAction={(key) => {
              closeAll();
              if (key === 'document') {
                pickDocument();
              } else if (key === 'location') {
                // TODO: implement location share
              } else if (key === 'gif') {
                // TODO: open GIF picker
              }
            }}
          />

          <ComposerMicSheet
            visible={micVisible}
            onClose={() => {
              setMicVisible(false);
            }}
            onLockOutsideCloseChange={setMicOutsideCloseLocked}
            onVoiceFlowChange={setMicVoiceFlowActive}
            textMode={micTextMode}
            height={micSheetHeight}
            onSendAudio={async (file) => {
              await handleSendAttachment(file as any);
            }}
            onTranscriptChange={(text) => {
              onTextChange(text);
            }}
            onSubmitTranscript={async (text) => {
              await sendTextDirect(text);
              setMicVisible(false);
            }}
            onRequestEditTranscript={() => {
              inputRef.current?.focus?.();
              // Close mic sheet after requesting focus so keyboard appears immediately.
              setTimeout(() => {
                setMicVisible(false);
              }, 0);
            }}
            onAction={(key) => {
              if (key === 'send_audio') {
                // audio mode handled inside ComposerMicSheet
                setMicTextMode(false);
              } else if (key === 'send_text') {
                setMicTextMode(true);
              }
            }}
          />

        </View>
      </View>
    </View>
  );
}