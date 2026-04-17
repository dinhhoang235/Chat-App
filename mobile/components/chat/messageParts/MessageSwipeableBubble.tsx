import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { getInitials } from '@/utils/initials';
import MessageFooter from './MessageFooter';

type MessageSwipeableBubbleProps = {
  message: any;
  onPress?: () => void;
  onReply?: () => void;
  onAvatarPress?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onCallAction?: (message: any, callData: any) => void;
  isLastInGroup?: boolean;
  isThreadLast?: boolean;
  isOutgoing: boolean;
  bubbleBg: string;
  animatedBorderStyle: any;
  children: React.ReactNode;
  replyBlock: React.ReactNode;
  colors: any;
  timeColor: string;
};

export default function MessageSwipeableBubble({
  message,
  onPress,
  onReply,
  onAvatarPress,
  onVoiceCall,
  onVideoCall,
  onCallAction,
  isLastInGroup,
  isThreadLast,
  isOutgoing,
  bubbleBg,
  animatedBorderStyle,
  children,
  replyBlock,
  colors,
  timeColor,
}: MessageSwipeableBubbleProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [0, 50, 100],
      outputRange: [0, 1, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ width: 68, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, marginVertical: 8 }}>
          <Animated.View style={{ transform: [{ scale }], width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="reply" size={24} color={colors.icon} />
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ width: 68, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginVertical: 8 }}>
          <Animated.View style={{ transform: [{ scale }], width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="reply" size={24} color={colors.icon} />
          </Animated.View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ position: 'relative' }}>
      {!message.fromMe && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 }} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16, marginVertical: 8 }}>
            <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={{ opacity: isLastInGroup ? 1 : 0 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVariant, overflow: 'hidden' }}>
                {message.contactAvatar ? (
                  <Image source={{ uri: message.contactAvatar }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{getInitials(message.contactName)}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={!message.fromMe ? renderLeftActions : undefined}
        renderRightActions={message.fromMe ? renderRightActions : undefined}
        onSwipeableWillOpen={() => {
          if (onReply) onReply();
          swipeableRef.current?.close();
        }}
        containerStyle={{ zIndex: 2 }}
      >
        <TouchableOpacity
          onPress={() => {
            if (message.type === 'call') {
              try {
                const callData = typeof message.content === 'string' ? JSON.parse(message.content || '{}') : message.content;
                const isVideo = callData?.callType === 'video';
                if (isVideo) onVideoCall?.();
                else onVoiceCall?.();
              } catch {
                onPress?.();
              }
            } else {
              onPress?.();
            }
          }}
          activeOpacity={0.95}
        >
          <View style={{ flexDirection: 'row', justifyContent: message.fromMe ? 'flex-end' : 'flex-start', paddingHorizontal: 16, marginVertical: 8 }}>
            {!message.fromMe && <View style={{ width: 40, height: 40 }} />}
            <View style={{ maxWidth: '72%', marginLeft: isOutgoing ? 'auto' : 12, alignItems: isOutgoing ? 'flex-end' : 'flex-start' }}>
              <Animated.View
                style={[
                  {
                    backgroundColor:
                      message.type === 'image' || message.type === 'image_group' || message.type === 'video'
                        ? 'transparent'
                        : message.type === 'call' && (JSON.parse(message.content || '{}').status === 'missed' && !message.fromMe)
                        ? 'rgba(255, 59, 48, 0.1)'
                        : bubbleBg,
                    borderWidth: message.type === 'image' || message.type === 'image_group' || message.type === 'video' ? 0 : 1,
                    padding: message.type === 'image' || message.type === 'image_group' || message.type === 'video' ? 0 : message.type === 'call' ? 14 : 12,
                    borderRadius: 18,
                    marginBottom: isLastInGroup ? 0 : -8,
                  },
                  message.type !== 'image' && message.type !== 'image_group' && message.type !== 'video' ? animatedBorderStyle : {},
                ]}
              >
                {replyBlock}
                {children}
              </Animated.View>
              <MessageFooter
                message={message}
                isOutgoing={isOutgoing}
                isLastInGroup={isLastInGroup}
                isThreadLast={isThreadLast}
                colors={colors}
                timeColor={timeColor}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
}
