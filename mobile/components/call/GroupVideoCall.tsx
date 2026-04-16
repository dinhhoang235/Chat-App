import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, StatusBar, Image, Animated } from 'react-native';
import { RTCView } from '@livekit/react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvatarUrl } from '@/utils/avatar';

export type GroupParticipant = {
  userId: number;
  fullName: string;
  avatar?: string;
  isLocal: boolean;
};

type Props = {
  participants: GroupParticipant[];
  localStreamURL: string | null;
  localVideoTrack: any;
  remoteStreams: Record<number, string>; // userId -> streamURL
  remoteVideoTracks: Record<number, any>; // userId -> Track object
  isCameraOn: boolean;
  cameraStatuses: Record<number, boolean>; // userId -> isCameraOn
  micStatuses: Record<number, boolean>; // userId -> isMicOn
  callStatus: string;
  formattedDuration: string;
  remoteName: string;
  userId: number;
  onHangup: () => void;
  onFlipCamera: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  isMuted: boolean;
};

export default function GroupVideoCall({
  participants,
  localStreamURL,
  localVideoTrack,
  remoteStreams,
  remoteVideoTracks,
  isCameraOn,
  cameraStatuses,
  micStatuses,
  callStatus,
  formattedDuration,
  remoteName,
  userId,
  onHangup,
  onFlipCamera,
  onToggleMute,
  onToggleCamera,
  isMuted,
}: Props) {
  const insets = useSafeAreaInsets();

  // Tap-to-toggle controls visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  const toggleControls = useCallback(() => {
    const nextVisible = !controlsVisible;
    Animated.timing(controlsOpacity, {
      toValue: nextVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setControlsVisible(nextVisible));
  }, [controlsVisible, controlsOpacity]);

  // Use all participants passed from the service
  const visibleParticipants = participants;

  const count = visibleParticipants.length;
  
  // Dynamic layout logic:
  let groupTileClass = 'w-1/2 h-1/3'; // Default for 5-6 people
  if (count === 1) {
    groupTileClass = 'w-full h-full';
  } else if (count === 2) {
    groupTileClass = 'w-full h-1/2';
  } else if (count === 4) {
    groupTileClass = 'w-1/2 h-1/2';
  }

  return (
    <TouchableWithoutFeedback onPress={toggleControls}>
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View className={`absolute inset-0 ${(Object.keys(remoteStreams).length === 0 && !isCameraOn) ? 'bg-[#1E40AF]' : 'bg-black'}`} />

        <View className="flex-1 flex-row flex-wrap">
          {visibleParticipants.map((participant, index) => {
            const isSelf = participant.userId === userId;
            const streamURL = isSelf ? localStreamURL : remoteStreams[participant.userId];
            const participantCameraOn = isSelf ? isCameraOn : (cameraStatuses[participant.userId] ?? true);
            const showVideo = !!streamURL && participantCameraOn;
            const displayName = isSelf ? 'Bạn' : participant.fullName || `Người tham gia (${participant.userId})`;
            
            // Special tile class for 3 participants: 2 top, 1 big bottom
            let tileClass = groupTileClass;
            if (count === 3) {
              tileClass = index < 2 ? 'w-1/2 h-1/2' : 'w-full h-1/2';
            }

            const initials = displayName
              .split(' ')
              .map((w) => w.charAt(0))
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const participantAvatarUrl = participant.avatar
              ? getAvatarUrl(participant.avatar)
              : null;

            return (
              <View key={participant.userId} className={`${tileClass} border border-white/10`}>
                {showVideo ? (
                  <RTCView
                    key={`tile-${participant.userId}`}
                    streamURL={streamURL!}
                    style={StyleSheet.absoluteFill}
                    objectFit="cover"
                    mirror={isSelf}
                    zOrder={0}
                  />
                ) : (
                  <View className="absolute inset-0 bg-black/70 items-center justify-center">
                    {participantAvatarUrl ? (
                      <Image
                        source={{ uri: participantAvatarUrl }}
                        className="w-[92px] h-[92px] rounded-full"
                        style={{ borderWidth: 2, borderColor: '#fff' }}
                      />
                    ) : (
                      <View className="w-[92px] h-[92px] rounded-full bg-[#0A84FF] items-center justify-center">
                        <Text className="text-white text-2xl font-bold">{initials}</Text>
                      </View>
                    )}
                  </View>
                )}
                <View className="absolute left-3 bottom-3 flex-row items-center gap-2">
                  {participantAvatarUrl ? (
                    <Image
                      source={{ uri: participantAvatarUrl }}
                      className="w-[28px] h-[28px] rounded-full"
                      style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' }}
                    />
                  ) : (
                    <View className="w-[28px] h-[28px] rounded-full bg-white/20 items-center justify-center">
                      <Text className="text-white text-[11px] font-bold">{initials}</Text>
                    </View>
                  )}
                  <View className="rounded-full bg-black/50 px-3 py-1 max-w-[140px] flex-row items-center gap-1.5">
                    <Text className="text-white text-sm font-semibold" numberOfLines={1}>
                      {displayName}
                    </Text>
                    {((isSelf && isMuted) || (!isSelf && micStatuses[participant.userId] === false)) && (
                      <Ionicons name="mic-off" size={14} color="#f87171" />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Header – fades in/out on tap */}
        <Animated.View
          className="absolute top-0 left-0 right-0 px-4 flex-row items-center justify-between"
          style={[{ opacity: controlsOpacity, paddingTop: insets.top + 6 }]}
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
        >
          <TouchableOpacity className="w-[42px] h-[42px] items-center justify-center rounded-full bg-black/25" onPress={onHangup}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-white text-lg font-bold tracking-wide" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              DiskordMes
            </Text>
            <Text className="text-[#4ade80] text-[15px] font-bold" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              {callStatus === 'active' ? (visibleParticipants.length > 1 ? formattedDuration : 'Đang chờ...') : callStatus === 'calling' ? 'Đang gọi...' : callStatus === 'connecting' ? 'Đang kết nối...' : 'Đã kết thúc'}
            </Text>
          </View>

          <TouchableOpacity className="w-[42px] h-[42px] items-center justify-center rounded-full bg-black/25" onPress={onFlipCamera} disabled={!isCameraOn}>
            <FontAwesome6 name="arrows-rotate" size={20} color={isCameraOn ? '#fff' : 'rgba(255,255,255,0.5)'} />
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom controls – fades in/out on tap */}
        <Animated.View
          style={[{ opacity: controlsOpacity, paddingBottom: insets.bottom + 40 }]}
          className="absolute bottom-0 left-0 right-0 px-5"
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
        >
          <View className="flex-row justify-between w-full max-w-[340px] self-center items-center">
            <ControlBtn icon={isCameraOn ? 'videocam' : 'videocam-off'} label="Camera" active={isCameraOn} onPress={onToggleCamera} />
            <ControlBtn icon={isMuted ? 'mic-off' : 'mic'} label="Mic" active={!isMuted} onPress={onToggleMute} />
            <ControlBtn icon="call" label="Kết thúc" variant="end" iconRotate="135deg" onPress={onHangup} />
            <ControlBtn icon="ellipsis-horizontal" label="Thêm" onPress={() => {}} />
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

function ControlBtn({
  icon,
  label,
  onPress,
  active,
  variant,
  iconRotate,
  disabled,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  active?: boolean;
  variant?: 'end';
  iconRotate?: string;
  disabled?: boolean;
}) {
  const isEnd = variant === 'end';
  let bgClass = 'bg-[rgba(255,255,255,0.14)]';
  if (isEnd) bgClass = 'bg-red-500';
  else if (active) bgClass = 'bg-white';
  const iconColor = active && !isEnd ? '#000' : '#fff';
  const opacityClass = disabled ? 'opacity-50' : 'opacity-100';

  return (
    <View className={`items-center gap-2 min-w-[75px] ${opacityClass}`}>
      <TouchableOpacity
        className={`w-[64px] h-[64px] rounded-[32px] items-center justify-center ${bgClass}`}
        style={
          isEnd
            ? {
                shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
                elevation: 8,
              }
            : undefined
        }
        onPress={onPress}
        activeOpacity={0.75}
        disabled={disabled}
      >
        <Ionicons
          name={icon}
          size={isEnd ? 32 : 24}
          color={iconColor}
          style={iconRotate ? { transform: [{ rotate: iconRotate }] } : undefined}
        />
      </TouchableOpacity>
      <Text className="text-white text-xs font-bold text-center" style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
        {label}
      </Text>
    </View>
  );
}
