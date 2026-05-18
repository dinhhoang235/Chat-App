import React from 'react';
import { View, FlatList, ActivityIndicator, Image, TouchableOpacity, Text, BackHandler, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { Header, GallerySheet, EmojiSheet, GiphySheet, TypingDots, ChatAvatar, GroupAvatar, InThreadSearch, MessageBubble, ComposerActionsSheet, ComposerMicSheet, ChatComposer, GroupVideoCallModal, MessageMenuModal, DeleteMessageSheet, LocationPreviewModal, ForwardMessageSheet } from '@/components';
import useSheetControl from '@/hooks/useSheetControl';
import { useChatThread } from '@/hooks/useChatThread';
import { useGroupCallAction } from '@/hooks/useGroupCallAction';
import { useCall } from '@/context/callContext';
import { chatApi } from '@/services/chat';
import { socketService } from '@/services/socket';
import { chatThreadCache } from '@/utils/chatThreadCache';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function ChatThread() {
  const DEFAULT_COMPOSER_HEIGHT = 74;
  const [micTextMode, setMicTextMode] = React.useState(false);
  const [micOutsideCloseLocked, setMicOutsideCloseLocked] = React.useState(false);
  const [micVoiceFlowActive, setMicVoiceFlowActive] = React.useState(false);
  const [groupVideoCallVisible, setGroupVideoCallVisible] = React.useState(false);
  const [composerHeight, setComposerHeight] = React.useState(DEFAULT_COMPOSER_HEIGHT);
  
  const [messageMenuVisible, setMessageMenuVisible] = React.useState(false);
  const [messageMenuPos, setMessageMenuPos] = React.useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [showMoreMenuActions, setShowMoreMenuActions] = React.useState(false);
  const [selectedMessage, setSelectedMessage] = React.useState<any>(null);
  const [editingMessage, setEditingMessage] = React.useState<any>(null);
  const [deleteSheetVisible, setDeleteSheetVisible] = React.useState(false);
  const [locationModalVisible, setLocationModalVisible] = React.useState(false);
  const [forwardSheetVisible, setForwardSheetVisible] = React.useState(false);

  const canForwardMessage = React.useMemo(() => {
    if (!selectedMessage || !selectedMessage.id) return false;
    const isTempMessage = selectedMessage.id?.toString?.().startsWith?.('temp-');
    return (
      !isTempMessage &&
      selectedMessage.status !== 'sending' &&
      selectedMessage.status !== 'error'
    );
  }, [selectedMessage]);
  const [gifVisible, setGifVisible] = React.useState(false);
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
    typingUserInitials,
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
    setMessageText,
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
    conversationId,
    setMessages,
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
    handleSendLocationData,
    isSendingLocation,
    handleSendGif,
    isSendingGif,
    handleRetryMessage,
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
    allMedia,
    deleteMessage
  } = useChatThread({
    gifVisible,
    openGroupVideoCallModal: React.useCallback(() => {
      setGroupVideoCallVisible(true);
    }, []),
  });
  const { activeCall, callStatus } = useCall();
  const [remoteActiveGroupCall, setRemoteActiveGroupCall] = React.useState(false);
  // Handle Android hardware back to ensure we return to chat list when opened from Profile
  React.useEffect(() => {
    const onHardwareBack = () => {
      try {
        if ((params as any)?.fromProfile === 'true') {
          router.replace('/(tabs)');
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    };

    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => subscription.remove();
    }
    // no-op on other platforms
    return;
  }, [params, router]);

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

  const handleSaveEdit = React.useCallback(async () => {
    if (!editingMessage || !conversationId) return;
    const trimmed = messageText.trim();
    if (!trimmed) return;

    let previousMessages: any[] = [];
    const messageIdStr = editingMessage.id?.toString();

    setMessages((prev) => {
      previousMessages = prev;
      const next = prev.map((m) =>
        m.id?.toString() === messageIdStr
          ? { ...m, content: trimmed, text: trimmed, updatedAt: new Date().toISOString(), edited: true }
          : m
      );
      chatThreadCache.setMessages(conversationId, next);
      return next;
    });

    setEditingMessage(null);
    setMessageText('');

    try {
      const response = await chatApi.editMessage(Number(conversationId), editingMessage.id, trimmed);
      const updated = response.data;
      setMessages((prev) => {
        const next = prev.map((m) =>
          m.id?.toString() === updated.id?.toString()
            ? { ...m, content: updated.content, text: updated.content, updatedAt: updated.updatedAt, edited: true }
            : m
        );
        chatThreadCache.setMessages(conversationId, next);
        return next;
      });
    } catch (err) {
      console.error('Edit message error:', err);
      setMessages(previousMessages);
      chatThreadCache.setMessages(conversationId, previousMessages);
      setEditingMessage(editingMessage);
      setMessageText(trimmed);
    }
  }, [conversationId, editingMessage, messageText, setMessageText, setMessages]);

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
        contactAvatarFallback={!isGroup ? (targetUser?.avatar || (params.avatar as string | undefined)) : undefined}
        onPress={() => {
          if (composerVisible) closeAll();
          if (gifVisible) setGifVisible(false);
        }}
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
        onRetry={handleRetryMessage}
        onLongPress={(msg, x, y, w, h) => {
          setSelectedMessage(msg);
          setMessageMenuPos({ x, y, w, h });
          setShowMoreMenuActions(false);
          setMessageMenuVisible(true);
        }}
      />
    );
  }, [processedMessages, colors, searchQuery, composerVisible, gifVisible, router, highlightedMessageId, uploadProgress, closeAll, setReplyingTo, scrollToMessageId, allMedia, startVoiceCall, startVideoCall, handleCallAction, isGroup, targetUser?.avatar, params.avatar, handleRetryMessage]);

  const maybeCloseAll = React.useCallback(() => {
    if (micOutsideCloseLocked) return;
    closeAll();
    if (gifVisible) setGifVisible(false);
  }, [micOutsideCloseLocked, closeAll, gifVisible]);

  const micSheetHeight = micVoiceFlowActive
    ? Math.round(sheetHeight + composerHeight)
    : sheetHeight;

  // Only show body loading if we have no messages AND either:
  // 1. Messages are still loading OR
  // 2. It's a 1-1 chat and we're waiting for user status
  const showBodyLoading = (loading || (!isGroup && !!targetUserIdState && targetUserStatus === null)) && processedMessages.length === 0;

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
              onBackPress={() => {
                if ((params as any)?.fromProfile === 'true') {
                  router.replace('/(tabs)');
                } else {
                  router.back();
                }
              }}
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
              {showBodyLoading ? (
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
                    extraData={[messages, isTyping ? displayTypingAvatar || true : false]}
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
                    // Tuned for smoother UI: lower initial render + smaller window
                    // reduces JS work during navigation/scroll. Increase batching
                    // period so renders are grouped and less likely to block frames.
                    initialNumToRender={6}
                    maxToRenderPerBatch={6}
                    windowSize={5}
                    updateCellsBatchingPeriod={50}
                    removeClippedSubviews={true}
                    scrollEventThrottle={16}
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
                    ListEmptyComponent={() => null}
                    ListHeaderComponent={() => isTyping ? (
                      <View className="px-4 py-2 flex-row items-center">
                        <View
                          className="w-10 h-10 rounded-full mr-3 items-center justify-center"
                          style={{ backgroundColor: displayTypingAvatar ? 'transparent' : colors.tint }}
                        >
                          {displayTypingAvatar ? (
                            <Image
                              source={{ uri: displayTypingAvatar }}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                              {typingUserInitials}
                            </Text>
                          )}
                        </View>
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
                    onSaveEdit={handleSaveEdit}
                    creatingConversation={creatingConversation}
                    composerVisible={composerVisible}
                    setComposerVisible={setComposerVisible}
                    colors={colors}
                    insets={insets}
                    onOpenSheet={(type) => {
                      if (gifVisible) setGifVisible(false);
                      openSheet(type);
                    }}
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
                      if (gifVisible) setGifVisible(false);
                    }}
                    editingMessage={editingMessage}
                    onCancelEdit={() => {
                      setEditingMessage(null);
                      setMessageText('');
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
            loadingAction={isSendingLocation ? 'location' : null}
            onAction={(key) => {
              if (key === 'document') {
                closeAll();
                pickDocument();
              } else if (key === 'location') {
                // Đóng actions sheet, mở location preview sheet
                setComposerVisible(false);
                setLocationModalVisible(true);
              } else if (key === 'gif') {
                if (galleryVisible) setGalleryVisible(false);
                if (emojiVisible) setEmojiVisible(false);
                if (micVisible) setMicVisible(false);
                setComposerVisible(false);
                setGifVisible(true);
              }
            }}
          />

          <GiphySheet
            visible={gifVisible}
            onClose={() => setGifVisible(false)}
            height={sheetHeight}
            sending={isSendingGif}
            onSelectGif={async (gif) => {
              await handleSendGif(gif);
              setGifVisible(false);
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
          
          <MessageMenuModal
            visible={messageMenuVisible}
            menuPos={messageMenuPos}
            message={selectedMessage}
            isOutgoing={!!selectedMessage?.fromMe}
            onClose={() => setMessageMenuVisible(false)}
            onAction={(action) => {
              if (action.startsWith('react_')) {
                const emoji = action.replace('react_', '');
                console.log('React with', emoji, 'to message', selectedMessage?.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                // TODO: implement reaction logic
                return;
              }
              
              switch (action) {
                case 'more':
                  setShowMoreMenuActions(true);
                  break;
                case 'less':
                  setShowMoreMenuActions(false);
                  break;
                case 'reply':
                  setReplyingTo(selectedMessage);
                  break;
                case 'copy':
                  Clipboard.setStringAsync(selectedMessage?.text || selectedMessage?.content || '');
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  break;
                case 'edit':
                  setEditingMessage(selectedMessage);
                  setMessageText(selectedMessage?.text || selectedMessage?.content || '');
                  setReplyingTo(null);
                  setMessageMenuVisible(false);
                  setTimeout(() => {
                    inputRef.current?.focus?.();
                  }, 0);
                  break;
                case 'forward':
                  setForwardSheetVisible(true);
                  setMessageMenuVisible(false);
                  break;
                case 'delete':
                  setDeleteSheetVisible(true);
                  break;
                case 'pin':
                  // TODO: implement pin
                  break;
              }
            }}
            items={!showMoreMenuActions ? [
              ...(selectedMessage?.fromMe && selectedMessage?.type === 'text' ? [{ key: 'edit', label: 'Chỉnh sửa', icon: 'edit' }] : []),
              { key: 'reply', label: 'Trả lời', icon: 'arrow-undo', ionicon: true },
              { key: 'copy', label: 'Sao chép', icon: 'content-copy' },
              { key: 'more', label: 'Khác', icon: 'more-horiz' },
            ] : [
              ...(canForwardMessage ? [{ key: 'forward', label: 'Chuyển tiếp', icon: 'arrow-redo', ionicon: true }] : []),
              { key: 'pin', label: 'Ghim', icon: 'push-pin' },
              ...(selectedMessage?.fromMe ? [{ key: 'delete', label: 'Thu hồi', icon: 'delete', destructive: true }] : []),
              { key: 'less', label: 'Khác', icon: 'more-horiz' },
            ]}
          >
            {selectedMessage && (
              <MessageBubble
                message={selectedMessage}
                isLastInGroup={true}
                isThreadLast={false}
                contactAvatarFallback={!isGroup ? (targetUser?.avatar || (params.avatar as string | undefined)) : undefined}
                isGroupThread={isGroup}
                // Pass dummy props to avoid interactions
                onPress={() => {}}
                onLongPress={() => {}}
                simple={true}
              />
            )}
          </MessageMenuModal>

          <LocationPreviewModal
            visible={locationModalVisible}
            onClose={() => setLocationModalVisible(false)}
            onConfirm={(lat, lng) => {
              setLocationModalVisible(false);
              handleSendLocationData(lat, lng);
            }}
          />

          <ForwardMessageSheet
            visible={forwardSheetVisible}
            currentConversationId={conversationId}
            onClose={() => setForwardSheetVisible(false)}
            message={selectedMessage}
            onForward={async (conversationIds) => {
              if (!selectedMessage || !selectedMessage.id) return;

              const sourceConversationId =
                selectedMessage.conversationId ?? conversationId;

              if (!sourceConversationId) return;

              try {
                await chatApi.forwardMessage(
                  sourceConversationId,
                  selectedMessage.id,
                  conversationIds,
                );
              } catch (error) {
                console.error('Forward message failed', {
                  sourceConversationId,
                  messageId: selectedMessage.id,
                  conversationIds,
                  error,
                });
              }
            }}
          />

          <DeleteMessageSheet
            visible={deleteSheetVisible}
            onClose={() => setDeleteSheetVisible(false)}
            onDeleteForMe={() => {
              if (selectedMessage) {
                deleteMessage(selectedMessage.id, 'deleteForMe');
              }
            }}
            onUnsend={() => {
              if (selectedMessage) {
                deleteMessage(selectedMessage.id, 'unsend');
              }
            }}
          />

        </View>
      </View>
    </View>
  );
}
