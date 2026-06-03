import React, { useEffect, useRef, memo } from 'react';
// Removed useChatThread import to prevent infinite loop
import { View, Text, useWindowDimensions, Animated, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/themeContext';
import Reanimated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle, useSharedValue, useAnimatedReaction } from 'react-native-reanimated';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MaterialIcons } from '@expo/vector-icons';
import MessageContent from './messageParts/MessageContent';
import MessageContactBubble from './messageParts/MessageContactBubble';
import MessageReplyPreview from './messageParts/MessageReplyPreview';
import MessageCallBubble from './messageParts/MessageCallBubble';
import MessageSwipeableBubble from './messageParts/MessageSwipeableBubble';
import MessageFooter from './messageParts/MessageFooter';
import { setMessageSize, getMessageSize } from '@/utils/messageSizeCache';
import { getAvatarUrl, getDefaultAvatarUrl } from '@/utils/avatar';


type ChatMessage = {
  id: string;
  text?: string;
  content?: string;
  time?: string;
  fromMe?: boolean;
  type?: 'text' | 'sticker' | 'contact' | 'separator' | 'system' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'image_group' | 'call';
  contactName?: string;
  contactAvatar?: string;
  contactAvatarColor?: string;
  reactions?: any[];
  seenBy?: { id: number; fullName?: string; avatar?: string }[];
  isLastInGroup?: boolean;
  status?: 'sending' | 'sent' | 'error';
  fileInfo?: { url: string; name?: string; size?: number; mime?: string; thumbnailUrl?: string; duration?: number; waveform?: number[] };
  images?: any[]; // for image_group
  replyTo?: any;
  progress?: number;
  isRevoked?: boolean;
};

function MessageBubbleComponent({ message, onPress, highlightQuery, onAvatarPress, isLastInGroup, isThreadLast, onReply, isHighlighted, onReplyPress, progress, allMedia, onVoiceCall, onVideoCall, onCallAction, isGroupThread, contactAvatarFallback, contactNameFallback, senderName, onRetry, onLongPress, onReactPress, simple, inModal, currentUserName, replyToSenderName }: { message: ChatMessage, onPress?: () => void, highlightQuery?: string, onAvatarPress?: () => void, isLastInGroup?: boolean, isThreadLast?: boolean, onReply?: () => void, isHighlighted?: boolean, onReplyPress?: (id: string) => void, progress?: number, allMedia?: any[], onVoiceCall?: () => void, onVideoCall?: () => void, onCallAction?: (message: ChatMessage, callData: any) => void, isGroupThread?: boolean, contactAvatarFallback?: string, contactNameFallback?: string, senderName?: string, onRetry?: (message: ChatMessage) => void, onLongPress?: (message: ChatMessage, x: number, y: number, w: number, h: number) => void, onReactPress?: (message: ChatMessage) => void, simple?: boolean, inModal?: boolean, currentUserName?: string, replyToSenderName?: string }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const bubbleRef = useRef<View>(null);
  const swipeableRef = useRef<SwipeableMethods>(null);
  const swipeTranslation = useSharedValue(0);
  const renderCountRef = useRef(0);
  const measuredHeightRef = useRef(0);
  renderCountRef.current++;

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

  if (simple) {
    const isOutgoing = !!message.fromMe;
    let bubbleBg = colors.bubbleOther;
    let textColor = colors.bubbleOtherText;

    if (isOutgoing) {
      bubbleBg = colors.bubbleMe;
      textColor = colors.bubbleMeText;
    }

    if (message.type === 'audio') {
      bubbleBg = isOutgoing ? '#6FAEFF' : '#DDEBFF';
      textColor = '#0F3E84';
    }

    const timeColor = colors.textSecondary;

    const callData = (() => {
      if (message.type !== 'call') return {} as any;
      try {
        return typeof message.content === 'string' ? JSON.parse(message.content) : (message.content || {});
      } catch {
        return {} as any;
      }
    })();

    // Ended group calls are always centered system messages — bypass the regular bubble layout
    if (message.type === 'call') {
      const isGroupCallSimple = Boolean(
        isGroupThread ||
        callData.isGroupCall ||
        (Array.isArray(callData.groupTargets) && callData.groupTargets.length > 2) ||
        (Array.isArray(callData.targetUserIds) && callData.targetUserIds.length > 1)
      );
      const isMissedSimple = callData.status === 'missed' || callData.status === 'rejected' || callData.status === 'no_answer';
      const isEndedGroupCallSimple = isGroupCallSimple && (isMissedSimple || callData.status === 'completed');
      if (isEndedGroupCallSimple) {
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
    }

    const simpleContent = (() => {
      if (message.isRevoked) {
        return (
          <View style={{ padding: 4 }}>
            <Text style={{
              color: isOutgoing ? colors.bubbleMeText : colors.textSecondary,
              fontStyle: 'italic',
              fontSize: 14,
              opacity: 0.8,
            }}>
              Tin nhắn đã được thu hồi
            </Text>
          </View>
        );
      }

      if (message.type === 'contact') {
        return (
          <MessageContactBubble
            message={message}
            onPress={onPress}
            onAvatarPress={onAvatarPress}
            colors={colors}
            onLongPress={() => {
              bubbleRef.current?.measureInWindow((x, y, w, h) => {
                onLongPress?.(message, x, y, w, h);
              });
            }}
          />
        );
      }

        if (message.type === 'image' || message.type === 'video' || message.type === 'image_group' || message.type === 'audio' || message.type === 'file' || message.type === 'location' || message.type === 'call') {
          return (
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
              deferHeavyMediaWork={simple}
              onLongPress={() => {
                bubbleRef.current?.measureInWindow((x, y, w, h) => {
                  onLongPress?.(message, x, y, w, h);
                });
              }}
            />
          );
        }

      return (
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
          onLongPress={() => {
            bubbleRef.current?.measureInWindow((x, y, w, h) => {
              onLongPress?.(message, x, y, w, h);
            });
          }}
        />
      );
    })();

    const avatarUri = message.contactAvatar || (contactAvatarFallback ? getAvatarUrl(contactAvatarFallback) || undefined : undefined);
    const showSenderNameSimple = Boolean(isGroupThread && !isOutgoing && (senderName || message.contactName));
    const resolvedSenderNameSimple = senderName || message.contactName || contactNameFallback;
    const hasReactionsSimple = message.reactions && message.reactions.length > 0;

    const LeftAction = ({ translation }: { translation: SharedValue<number> }) => {
      useAnimatedReaction(
        () => translation.value,
        (val: number) => { swipeTranslation.value = val; }
      );
      const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translation.value, [20, 50], [0, 1], Extrapolation.CLAMP),
        transform: [
          { translateX: interpolate(translation.value, [20, 50], [-20, 0], Extrapolation.CLAMP) },
          { scale: interpolate(translation.value, [20, 50], [0.6, 1], Extrapolation.CLAMP) },
        ],
      }));
      return (
        <View style={{ width: 68, height: '100%', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: 10 }}>
            <Reanimated.View style={[{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
              <MaterialIcons name="reply" size={24} color={colors.icon} />
            </Reanimated.View>
          </View>
        </View>
      );
    };

    const RightAction = ({ translation }: { translation: SharedValue<number> }) => {
      const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(translation.value, [-50, -20, 0], [1, 0, 0], Extrapolation.CLAMP),
        transform: [
          { translateX: interpolate(translation.value, [-50, -20, 0], [0, 20, 20], Extrapolation.CLAMP) },
          { scale: interpolate(translation.value, [-50, -20, 0], [1, 0.6, 0.6], Extrapolation.CLAMP) },
        ],
      }));
      return (
        <View style={{ width: 68, height: '100%', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 8 }}>
            <Reanimated.View style={[{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
              <MaterialIcons name="reply" size={24} color={colors.icon} />
            </Reanimated.View>
          </View>
        </View>
      );
    };

    const renderLeftActions = (_progress: SharedValue<number>, translation: SharedValue<number>) => (
      <LeftAction translation={translation} />
    );

    const renderRightActions = (_progress: SharedValue<number>, translation: SharedValue<number>) => (
      <RightAction translation={translation} />
    );

    if (inModal) {
      return (
        <View
          ref={bubbleRef}
          style={{
            backgroundColor:
              message.type === 'image' || message.type === 'image_group' || message.type === 'video' || message.type === 'location' || message.type === 'contact'
                ? 'transparent'
                : message.type === 'call' && (callData.status === 'missed' && !message.fromMe)
                ? 'rgba(255, 59, 48, 0.1)'
                : bubbleBg,
            borderWidth: 0,
            borderColor: 'transparent',
            padding: (message.type === 'image' || message.type === 'image_group' || message.type === 'video' || message.type === 'location' || message.type === 'contact') ? 0 : message.type === 'call' ? 14 : 12,
            borderRadius: 18,
          }}
        >
          {simpleContent}
        </View>
      );
    }

    return (
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout?.height;
          if (h && Math.abs(h - measuredHeightRef.current) > 0.5) {
            measuredHeightRef.current = h;
            setMessageSize(message.id, h);
            if (__DEV__) {
              const prev = getMessageSize(message.id);
              if (prev !== Math.round(h)) {
                console.warn(`[onLayout] id=${message.id} type=${message.type} h=${h} cached=${prev} -> ${Math.round(h)}`);
              }
            }
          }
        }}
        style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
        {showSenderNameSimple && (
          <View style={{ marginLeft: isOutgoing ? 0 : 52, maxWidth: '85%', alignSelf: isOutgoing ? 'flex-end' : 'flex-start' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }} numberOfLines={1}>
              {resolvedSenderNameSimple}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
          {!isOutgoing && (
            isLastInGroup ? (
              <View style={{ width: 40, height: 40, marginRight: 12 }}>
                <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', overflow: 'hidden' }}>
                    {avatarUri ? (
                      <Image key={`av-${avatarUri}`} source={{ uri: avatarUri }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    ) : (
                      <Image key={`av-default`} source={{ uri: getDefaultAvatarUrl() }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: 52 }} />
            )
          )}
          <View style={{ alignSelf: isOutgoing ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
            <Swipeable
              ref={swipeableRef}
              enabled={message.type !== 'call' && !message.isRevoked}
              leftThreshold={isOutgoing ? 1000 : 50}
              rightThreshold={!isOutgoing ? 1000 : 50}
              overshootLeft={!isOutgoing}
              overshootRight={isOutgoing}
              renderLeftActions={!isOutgoing ? renderLeftActions : undefined}
              renderRightActions={isOutgoing ? renderRightActions : undefined}
              onSwipeableWillOpen={() => {
                if (onReply) onReply();
                swipeableRef.current?.close();
              }}
              containerStyle={{ zIndex: 2, overflow: 'visible' }}
            >
              <Pressable
                onPress={onPress}
                onLongPress={() => {
                  if (message.isRevoked || message.type === 'call') return;
                  bubbleRef.current?.measureInWindow((x, y, w, h) => {
                    onLongPress?.(message, x, y, w, h);
                  });
                }}
                delayLongPress={200}
              >
                <View
                  ref={bubbleRef}
                  style={{
                    backgroundColor:
                      message.type === 'image' || message.type === 'image_group' || message.type === 'video' || message.type === 'location' || message.type === 'contact'
                        ? 'transparent'
                        : message.type === 'call' && (callData.status === 'missed' && !message.fromMe)
                        ? 'rgba(255, 59, 48, 0.1)'
                        : bubbleBg,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    padding: (message.type === 'image' || message.type === 'image_group' || message.type === 'video' || message.type === 'location' || message.type === 'contact') ? 0 : message.type === 'call' ? 14 : 12,
                    borderRadius: 18,
                  }}
                >
                  {message.replyTo && (
                    <MessageReplyPreview
                      replyTo={message.replyTo}
                      onReplyPress={onReplyPress}
                      isOutgoing={isOutgoing}
                      colors={colors}
                      currentUserName={currentUserName}
                      contactNameFallback={contactNameFallback}
                      replyToSenderName={replyToSenderName}
                    />
                  )}
                  {simpleContent}
                </View>
              </Pressable>
            </Swipeable>

            {hasReactionsSimple && (() => {
              const sortedReactionsSimple = [...message.reactions].sort((a: any, b: any) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id || Date.now());
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id || Date.now());
                return timeA - timeB;
              });
              const uniqueReactionsSimple = Array.from(new Set(sortedReactionsSimple.map((r: any) => r.reaction))) as string[];
              return (
                <TouchableOpacity
                  onPress={() => onReactPress?.(message)}
                  activeOpacity={0.8}
                  style={{
                    marginTop: -7,
                    marginLeft: isOutgoing ? undefined : 4,
                    marginRight: isOutgoing ? 4 : undefined,
                    height: 22,
                    borderRadius: 11,
                    paddingHorizontal: 6,
                    backgroundColor: colors.surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.2,
                    borderColor: colors.border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 1.5,
                    elevation: 3,
                    zIndex: 100,
                    gap: 2,
                  }}
                >
                  <Text style={{ fontSize: 13, textAlign: 'center', marginTop: Platform.OS === 'ios' ? 0 : -1 }}>
                    {uniqueReactionsSimple.slice(0, 3).join('')}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginLeft: 2 }}>
                    {message.reactions.length}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
        <View style={{ marginLeft: isOutgoing ? 0 : 52 }}>
          <MessageFooter
            message={message}
            isOutgoing={isOutgoing}
            isLastInGroup={isLastInGroup}
            isThreadLast={isThreadLast}
            colors={colors}
            timeColor={timeColor}
            onRetry={onRetry}
          />
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
  let contentElement: React.ReactNode;
  if (message.isRevoked) {
    contentElement = (
      <View style={{ padding: 4 }}>
        <Text style={{ 
          color: isOutgoing ? colors.bubbleMeText : colors.textSecondary, 
          fontStyle: 'italic',
          fontSize: 14,
          opacity: 0.8
        }}>
          Tin nhắn đã được thu hồi
        </Text>
      </View>
    );
  } else if (message.type === 'contact') {
    contentElement = (
      <MessageContactBubble
        message={message}
        onPress={onPress}
        onAvatarPress={onAvatarPress}
        colors={colors}
        onLongPress={() => {
          bubbleRef.current?.measureInWindow((x, y, w, h) => {
            onLongPress?.(message, x, y, w, h);
          });
        }}
      />
    );
  } else {
    contentElement = (
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
        deferHeavyMediaWork={simple}
        onLongPress={() => {
          bubbleRef.current?.measureInWindow((x, y, w, h) => {
            onLongPress?.(message, x, y, w, h);
          });
        }}
      />
    );
  }

  const replyBlock = message.replyTo && (
    <MessageReplyPreview
      replyTo={message.replyTo}
      onReplyPress={onReplyPress}
      isOutgoing={isOutgoing}
      colors={colors}
      currentUserName={currentUserName}
      contactNameFallback={contactNameFallback}
      replyToSenderName={replyToSenderName}
    />
  );

  return (
    <MessageSwipeableBubble
      message={message}
      contactAvatarFallback={contactAvatarFallback}
      contactNameFallback={contactNameFallback}
    senderName={senderName}
      onPress={onPress}
      onReply={onReply}
      onAvatarPress={onAvatarPress}
      onVoiceCall={onVoiceCall}
      onVideoCall={onVideoCall}
      onCallAction={onCallAction}
      isLastInGroup={isLastInGroup}
      isThreadLast={isThreadLast}
      isGroupThread={isGroupThread}
      isOutgoing={isOutgoing}
      bubbleBg={bubbleBg}
      animatedBorderStyle={animatedBorderStyle}
      highlightRowStyle={highlightRowStyle}
      replyBlock={replyBlock}
      colors={colors}
      timeColor={timeColor}
      onRetry={onRetry}
      onLongPress={(x, y, w, h) => onLongPress?.(message, x, y, w, h)}
      onMeasure={(id, h) => {
        // store measured height for use in overrideItemLayout
        setMessageSize(message.id || id, h);
      }}
      onQuickReactPress={() => onReactPress?.(message)}
      simple={simple}
    >
      {contentElement}
    </MessageSwipeableBubble>
  );
}

function areMediaFilesEqual(prevFileInfo: any, nextFileInfo: any) {
  if (prevFileInfo === nextFileInfo) return true;
  if (!prevFileInfo || !nextFileInfo) return false;
  return (
    prevFileInfo.url === nextFileInfo.url &&
    prevFileInfo.thumbnailUrl === nextFileInfo.thumbnailUrl &&
    prevFileInfo.thumbnail === nextFileInfo.thumbnail &&
    prevFileInfo.thumb === nextFileInfo.thumb &&
    prevFileInfo.width === nextFileInfo.width &&
    prevFileInfo.height === nextFileInfo.height &&
    prevFileInfo.duration === nextFileInfo.duration &&
    prevFileInfo.mime === nextFileInfo.mime
  );
}

function areMessageBubblePropsEqual(prevProps: any, nextProps: any) {
  // Must check component-level props first before comparing message identity,
  // otherwise changing simple/highlight/progress won't trigger re-render
  // when the message object reference hasn't changed.
  if (prevProps.simple !== nextProps.simple) return false;
  if (prevProps.isLastInGroup !== nextProps.isLastInGroup) return false;
  if (prevProps.isThreadLast !== nextProps.isThreadLast) return false;
  if (prevProps.isHighlighted !== nextProps.isHighlighted) return false;
  if (prevProps.highlightQuery !== nextProps.highlightQuery) return false;
  if (prevProps.progress !== nextProps.progress) return false;
  if (prevProps.isGroupThread !== nextProps.isGroupThread) return false;
  if (prevProps.contactAvatarFallback !== nextProps.contactAvatarFallback) return false;
  if (prevProps.contactNameFallback !== nextProps.contactNameFallback) return false;
  if (prevProps.senderName !== nextProps.senderName) return false;
  if (prevProps.currentUserName !== nextProps.currentUserName) return false;
  if (prevProps.replyToSenderName !== nextProps.replyToSenderName) return false;
  if ((prevProps.allMedia?.length ?? 0) !== (nextProps.allMedia?.length ?? 0)) return false;

  const prev = prevProps.message;
  const next = nextProps.message;
  if (prev === next) return true;
  if (!prev || !next) return false;

  if (prev.id !== next.id) return false;
  if (prev.type !== next.type) return false;
  if (prev.text !== next.text) return false;
  if (prev.content !== next.content) return false;
  if (prev.time !== next.time) return false;
  if (prev.fromMe !== next.fromMe) return false;
  if (prev.status !== next.status) return false;
  if (prev.isRevoked !== next.isRevoked) return false;
  if (prev.edited !== next.edited) return false;
  if (prev.senderId !== next.senderId) return false;
  if (prev.contactName !== next.contactName) return false;
  if (prev.contactAvatar !== next.contactAvatar) return false;
  if (prev.replyTo?.id !== next.replyTo?.id) return false;
  if (prev.reactions?.length !== next.reactions?.length) return false;
  if (prev.reactions?.length) {
    for (let i = 0; i < prev.reactions.length; i++) {
      if (prev.reactions[i].reaction !== next.reactions[i].reaction) return false;
      if (prev.reactions[i].userId !== next.reactions[i].userId) return false;
    }
  }
  if ((prev.images?.length ?? 0) !== (next.images?.length ?? 0)) return false;
  if (!areMediaFilesEqual(prev.fileInfo, next.fileInfo)) return false;

  return true;
}

const MessageBubble = memo(MessageBubbleComponent, areMessageBubblePropsEqual);

export default MessageBubble;

