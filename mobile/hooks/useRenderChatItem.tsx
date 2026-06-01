import React from 'react';
import { View, Text } from 'react-native';
import { MessageBubble } from '@/components';

export default function useRenderChatItem(params: any) {
  const {
    processedMessages,
    colors,
    searchQuery,
    composerVisible,
    closeAll,
    gifVisible,
    setGifVisible,
    router,
    highlightedMessageId,
    uploadProgress,
    setReplyingTo,
    scrollToMessageId,
    allMedia,
    startVoiceCall,
    startVideoCall,
    handleCallAction,
    isGroup,
    targetUser,
    paramsObj,
    paramName,
    handleRetryMessage,
    setSelectedMessage,
    setMessageMenuPos,
    setShowMoreMenuActions,
    setMessageMenuVisible,
    setReactionSheetVisible,
    setReactionsDetailVisible,
    user,
    groupDetails,
  } = params;

  return React.useCallback(({ item, index }: any) => {
    if (item.type === 'date_separator') {
      return (
        <View key={`sep-${item.id}`} className="items-center my-4">
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
            {item.date}
          </Text>
        </View>
      );
    }

    const nextMessage = processedMessages[index - 1];
    const isLastInConsecutiveGroup = !nextMessage || nextMessage.senderId !== item.senderId;
    const isThreadLast = index === 0;
    const shouldUseSimpleMode = true;

    let groupSenderAvatar: string | undefined = undefined;
    let groupSenderName: string | undefined = undefined;
    let replyToSenderName: string | undefined = undefined;

    if (isGroup && groupDetails?.participants) {
      const senderObj = groupDetails.participants.find((p: any) => {
        const pUserId = p.user?.id;
        const matches = pUserId != null && String(pUserId) === String(item.senderId);
        return matches;
      });
      const sender = senderObj?.user;
      if (sender) {
        groupSenderAvatar = sender.avatar || undefined;
        groupSenderName = sender.fullName || undefined;
      }

      if (item.replyTo?.senderId != null) {
        const repliedSenderObj = groupDetails.participants.find((p: any) => {
          const pUserId = p.user?.id;
          return pUserId != null && String(pUserId) === String(item.replyTo.senderId);
        });
        replyToSenderName = repliedSenderObj?.user?.fullName || undefined;
      }
    } else if (!isGroup && item.replyTo?.senderId != null) {
      const repliedSenderId = String(item.replyTo.senderId);
      const isCurrentUser = String(user?.id) === repliedSenderId;
      replyToSenderName = isCurrentUser ? user?.fullName : (targetUser?.fullName || (paramName as string | undefined));
    }

    const finalSenderName = item.sender?.fullName || item.contactName || groupSenderName;

    return (
      <MessageBubble key={`msg-${item.id}`}
        message={item}
        simple={shouldUseSimpleMode}
        highlightQuery={searchQuery}
        isLastInGroup={isLastInConsecutiveGroup}
        isThreadLast={isThreadLast}
        senderName={finalSenderName}
        contactAvatarFallback={isGroup ? groupSenderAvatar : (targetUser?.avatar || (paramsObj.avatar as string | undefined))}
        contactNameFallback={isGroup ? groupSenderName : (targetUser?.fullName || (paramName as string | undefined))}
        onPress={() => {
          if (composerVisible) closeAll();
          if (gifVisible) setGifVisible(false);
        }}
        onAvatarPress={() => {
          if (item.fromMe) return router.push('/profile/me');
          router.push(`/profile/${item.senderId}`);
        }}
        onReply={() => {
          setReplyingTo(item);
        }}
        isHighlighted={item.id?.toString() === highlightedMessageId}
        onReplyPress={(replyId: string) => scrollToMessageId(replyId)}
        progress={uploadProgress[item.id]}
        allMedia={allMedia}
        onVoiceCall={startVoiceCall}
        onVideoCall={startVideoCall}
        onCallAction={handleCallAction}
        isGroupThread={isGroup}
        onRetry={handleRetryMessage}
        onLongPress={(msg: any, x: number, y: number, w: number, h: number) => {
          setSelectedMessage(msg);
          setMessageMenuPos({ x, y, w, h });
          setShowMoreMenuActions(false);
          setMessageMenuVisible(true);
        }}
        onReactPress={(msg: any) => {
          setSelectedMessage(msg);
          if (msg.reactions && msg.reactions.length > 0) {
            setReactionsDetailVisible(true);
          } else {
            setReactionSheetVisible(true);
          }
        }}
        currentUserName={user?.fullName}
        replyToSenderName={replyToSenderName}
      />
    );
  }, [
    processedMessages,
    colors,
    searchQuery,
    composerVisible,
    gifVisible,
    closeAll,
    setGifVisible,
    router,
    highlightedMessageId,
    uploadProgress,
    setReplyingTo,
    scrollToMessageId,
    allMedia,
    startVoiceCall,
    startVideoCall,
    handleCallAction,
    isGroup,
    targetUser,
    paramsObj,
    paramName,
    handleRetryMessage,
    setSelectedMessage,
    setMessageMenuPos,
    setShowMoreMenuActions,
    setMessageMenuVisible,
    setReactionSheetVisible,
    setReactionsDetailVisible,
    user,
    groupDetails,
  ]);
}
