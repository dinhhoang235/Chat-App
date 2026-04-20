import React, { useEffect, useRef } from 'react';
// Removed useChatThread import to prevent infinite loop
import { View, Text, useWindowDimensions, Animated } from 'react-native';
import { useTheme } from '@/context/themeContext';
import MessageContent from './messageParts/MessageContent';
import MessageContactBubble from './messageParts/MessageContactBubble';
import MessageReplyPreview from './messageParts/MessageReplyPreview';
import MessageCallBubble from './messageParts/MessageCallBubble';
import MessageSwipeableBubble from './messageParts/MessageSwipeableBubble';


type ChatMessage = {
  id: string;
  text?: string;
  content?: string;
  time?: string;
  fromMe?: boolean;
  type?: 'text' | 'sticker' | 'contact' | 'separator' | 'system' | 'image' | 'video' | 'audio' | 'file' | 'image_group' | 'call';
  contactName?: string;
  contactAvatar?: string;
  contactAvatarColor?: string;
  reactions?: { emoji: string; count?: number }[];
  seenBy?: { id: number; fullName?: string; avatar?: string }[];
  isLastInGroup?: boolean;
  status?: 'sending' | 'sent' | 'error';
  fileInfo?: { url: string; name?: string; size?: number; mime?: string; thumbnailUrl?: string; duration?: number; waveform?: number[] };
  images?: any[]; // for image_group
  replyTo?: any;
  progress?: number;
};

export default function MessageBubble({ message, onPress, highlightQuery, onAvatarPress, isLastInGroup, isThreadLast, onReply, isHighlighted, onReplyPress, progress, allMedia, onVoiceCall, onVideoCall, onCallAction, isGroupThread }: { message: ChatMessage, onPress?: () => void, highlightQuery?: string, onAvatarPress?: () => void, isLastInGroup?: boolean, isThreadLast?: boolean, onReply?: () => void, isHighlighted?: boolean, onReplyPress?: (id: string) => void, progress?: number, allMedia?: any[], onVoiceCall?: () => void, onVideoCall?: () => void, onCallAction?: (message: ChatMessage, callData: any) => void, isGroupThread?: boolean }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const highlightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.delay(1500),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isHighlighted, highlightAnim]);

  if (message.type === 'separator' || message.type === 'system') {
    const textToShow = message.text || message.content;
    return (
      <View className="w-full items-center my-2">
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceVariant }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{textToShow}</Text>
        </View>
      </View>
    );
  }


  const isOutgoing = !!message.fromMe;
  let bubbleBg = colors.bubbleOther;
  let borderColor = colors.surfaceVariant;
  let textColor = colors.bubbleOtherText;
  const timeColor = colors.textSecondary;

  if (isOutgoing) {
    bubbleBg = colors.bubbleMe;
    borderColor = colors.bubbleMeBorder || colors.bubbleMe;
    textColor = colors.bubbleMeText;
  }

  if (message.type === 'audio') {
    bubbleBg = isOutgoing ? '#6FAEFF' : '#DDEBFF';
    borderColor = isOutgoing ? '#6FAEFF' : '#DDEBFF';
    textColor = '#0F3E84';
  }

  const animatedBorderStyle = {
    borderColor: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [borderColor, colors.tint],
    }),
    borderWidth: 1, // Keep fixed width or animate if desired
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
    }),
    shadowRadius: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    }),
  };

  const highlightRowStyle = {
    backgroundColor: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(59, 130, 246, 0)', 'rgba(59, 130, 246, 0.12)'],
    }),
    zIndex: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 10],
    }),
  };

  const isEndedGroupCall = (() => {
    if (message.type !== 'call') return false;
    let callData: any = {};
    try {
      callData = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
    } catch {
      callData = {};
    }
    const isGroupCall = Boolean(
      isGroupThread ||
      callData.isGroupCall ||
      (Array.isArray(callData.groupTargets) && callData.groupTargets.length > 2) ||
      (Array.isArray(callData.targetUserIds) && callData.targetUserIds.length > 1)
    );
    const isMissed = callData.status === 'missed' || callData.status === 'rejected' || callData.status === 'no_answer';
    return isGroupCall && (isMissed || callData.status === 'completed');
  })();

  if (isEndedGroupCall) {
    return (
      <MessageCallBubble
        message={message}
        onVoiceCall={onVoiceCall}
        onVideoCall={onVideoCall}
        onCallAction={onCallAction}
        isGroupThread={isGroupThread}
        colors={colors}
      />
    );
  }

  let contentElement: React.ReactNode = (
    <MessageContent
      message={message}
      screenWidth={screenWidth}
      colors={colors}
      allMedia={allMedia}
      progress={progress}
      textColor={textColor}
      highlightQuery={highlightQuery}
      onVoiceCall={onVoiceCall}
      onVideoCall={onVideoCall}
      onCallAction={onCallAction}
      isGroupThread={isGroupThread}
    />
  );

  // Contact card style
  if (message.type === 'contact') {
    return (
      <MessageContactBubble
        message={message}
        onPress={onPress}
        onAvatarPress={onAvatarPress}
        colors={colors}
      />
    );
  }

  const replyBlock = message.replyTo && (
    <MessageReplyPreview
      replyTo={message.replyTo}
      onReplyPress={onReplyPress}
      isOutgoing={isOutgoing}
      colors={colors}
    />
  );

  return (
    <MessageSwipeableBubble
      message={message}
      onPress={onPress}
      onReply={onReply}
      onAvatarPress={onAvatarPress}
      onVoiceCall={onVoiceCall}
      onVideoCall={onVideoCall}
      onCallAction={onCallAction}
      isLastInGroup={isLastInGroup}
      isThreadLast={isThreadLast}
      isOutgoing={isOutgoing}
      bubbleBg={bubbleBg}
      animatedBorderStyle={animatedBorderStyle}
      highlightRowStyle={highlightRowStyle}
      replyBlock={replyBlock}
      colors={colors}
      timeColor={timeColor}
    >
      {contentElement}
    </MessageSwipeableBubble>
  );
}
