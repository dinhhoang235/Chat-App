import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, Animated as RNAnimated } from 'react-native';
import Reanimated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle, useSharedValue, useAnimatedReaction } from 'react-native-reanimated';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
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
  highlightRowStyle?: any;
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
  highlightRowStyle,
}: MessageSwipeableBubbleProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);

  const swipeTranslation = useSharedValue(0);

  const LeftAction = ({ translation }: { translation: SharedValue<number> }) => {
    useAnimatedReaction(
      () => translation.value,
      (val: number) => {
        swipeTranslation.value = val;
      }
    );

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(translation.value, [20, 50], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(translation.value, [20, 50], [-20, 0], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(translation.value, [20, 50], [0.6, 1], Extrapolation.CLAMP),
        },
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
        {
          translateX: interpolate(translation.value, [-50, -20, 0], [0, 20, 20], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(translation.value, [-50, -20, 0], [1, 0.6, 0.6], Extrapolation.CLAMP),
        },
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

  const renderLeftActions = (_progress: SharedValue<number>, translation: SharedValue<number>) => {
    return <LeftAction translation={translation} />;
  };

  const renderRightActions = (_progress: SharedValue<number>, translation: SharedValue<number>) => {
    return <RightAction translation={translation} />;
  };

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swipeTranslation.value, [0, 50], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(swipeTranslation.value, [0, 50], [1, 0.3], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <RNAnimated.View style={[{ position: 'relative', paddingVertical: 8 }, highlightRowStyle]}>
      {!message.fromMe && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 8, bottom: 0, zIndex: 1 }} pointerEvents="box-none">
          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 16 }}>
            <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={{ opacity: isLastInGroup ? 1 : 0 }}>
              <Reanimated.View 
                style={[
                  { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVariant, overflow: 'hidden' },
                  avatarAnimatedStyle
                ]}
              >
                {message.contactAvatar ? (
                  <Image source={{ uri: message.contactAvatar }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{getInitials(message.contactName)}</Text>
                )}
              </Reanimated.View>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: isOutgoing ? 'flex-end' : 'flex-start', paddingHorizontal: 16 }}>
        <Swipeable
          ref={swipeableRef}
          enabled={message.type !== 'call'}
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
          containerStyle={{ zIndex: 2, overflow: 'visible', maxWidth: '85%' }}
        >
          <Pressable 
            onPress={onPress}
            android_disableSound={true}
            style={{ flexDirection: 'row', alignItems: 'flex-start' }}
          >
            {!message.fromMe && <View style={{ width: 40, height: 40 }} />}
            <View style={{ marginLeft: isOutgoing ? 0 : 12, alignItems: isOutgoing ? 'flex-end' : 'flex-start' }}>
              <RNAnimated.View
                style={[
                  {
                    backgroundColor:
                      message.type === 'image' || message.type === 'image_group' || message.type === 'video'
                        ? 'transparent'
                        : message.type === 'call' && (JSON.parse(message.content || '{}').status === 'missed' && !message.fromMe)
                        ? 'rgba(255, 59, 48, 0.1)'
                        : bubbleBg,
                    borderWidth: message.type === 'image' || message.type === 'image_group' || message.type === 'video' ? 0 : 1.2,
                    padding: message.type === 'image' || message.type === 'image_group' || message.type === 'video' ? 0 : message.type === 'call' ? 14 : 12,
                    borderRadius: 18,
                    marginBottom: isLastInGroup ? 0 : -8,
                  },
                  message.type !== 'image' && message.type !== 'image_group' && message.type !== 'video' ? animatedBorderStyle : {},
                ]}
              >
                {replyBlock}
                {children}
              </RNAnimated.View>
              <MessageFooter
                message={message}
                isOutgoing={isOutgoing}
                isLastInGroup={isLastInGroup}
                isThreadLast={isThreadLast}
                colors={colors}
                timeColor={timeColor}
              />
            </View>
          </Pressable>
        </Swipeable>
      </View>
    </RNAnimated.View>
  );
}
