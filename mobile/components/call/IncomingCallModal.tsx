import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCall } from '@/context/callContext';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';

const AVATAR_SIZE = 140;

export function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  // Pulse animation for the avatar rings
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!incomingCall) return;

    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = createPulse(pulse1, 0);
    const a2 = createPulse(pulse2, 400);
    const a3 = createPulse(pulse3, 800);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      pulse1.setValue(1);
      pulse2.setValue(1);
      pulse3.setValue(1);
    };
  }, [incomingCall, pulse1, pulse2, pulse3]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';
  const isGroup = incomingCall.isGroupCall;
  const avatarUrl = getAvatarUrl(incomingCall.remoteAvatar);
  const initials = getInitials(incomingCall.remoteName);
  const callLabel = isVideo
    ? isGroup
      ? 'Cuộc gọi video nhóm'
      : 'Cuộc gọi video đến'
    : 'Cuộc gọi thoại đến';

  return (
    <Modal
      visible={!!incomingCall}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-[#1E40AF]">
        <View className="absolute inset-0 bg-[#1E40AF]" />

        {/* Top Header */}
        <View className="mt-[60px] items-center">
          <Text className="text-white text-[22px] font-semibold">DiskordMes</Text>
        </View>

        {/* Pulsing avatar */}
        <View className="mt-[60px] h-[300px] items-center justify-center">
          {[pulse3, pulse2, pulse1].map((p, i) => (
            <Animated.View
              key={i}
              className="absolute bg-white"
              style={[
                {
                  width: AVATAR_SIZE + 40 + i * 40,
                  height: AVATAR_SIZE + 40 + i * 40,
                  borderRadius: (AVATAR_SIZE + 40 + i * 40) / 2,
                  transform: [{ scale: p }],
                  opacity: p.interpolate({
                    inputRange: [1, 1.6],
                    outputRange: [0.25 - i * 0.05, 0],
                  }),
                },
              ]}
            />
          ))}
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="w-[140px] h-[140px] rounded-[70px] border border-white/40"
            />
          ) : (
            <View className="w-[140px] h-[140px] rounded-[70px] border border-white/40 bg-blue-500 items-center justify-center">
              <Text className="text-white text-[48px] font-bold">{initials}</Text>
            </View>
          )}
        </View>

        {/* Caller Info */}
        <View className="items-center -mt-5">
          <Text className="text-white text-[32px] font-bold mb-2" numberOfLines={1}>
            {incomingCall.remoteName}
          </Text>
            <Text className="text-white/80 text-base">
            DiskordMes: {callLabel}
          </Text>
        </View>

        {/* Action buttons */}
        <View className="flex-row justify-around w-full absolute bottom-[80px] px-5">
          {/* Reject */}
          <View className="items-center gap-3">
            <TouchableOpacity
              className="w-[80px] h-[80px] rounded-[40px] items-center justify-center bg-red-500"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 10,
              }}
              onPress={rejectCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <Text className="text-white text-base font-medium">Từ chối</Text>
          </View>

          {/* Accept */}
          <View className="items-center gap-3">
            <TouchableOpacity
              className="w-[80px] h-[80px] rounded-[40px] items-center justify-center bg-green-500"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 10,
              }}
              onPress={() => acceptCall()}
              activeOpacity={0.8}
            >
              <Ionicons name={isVideo ? 'videocam' : 'call'} size={32} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white text-base font-medium">Chấp nhận</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
