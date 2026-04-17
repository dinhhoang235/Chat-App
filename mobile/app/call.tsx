import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCall } from '@/context/callContext';
import { useAuth } from '@/context/authContext';
import { webrtcService } from '@/services/webrtc';
import { socketService } from '@/services/socket';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';

const AVATAR_SIZE = 140;

export default function CallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeCall, callStatus, endCall, setCallStatus } = useCall();
  const { user } = useAuth();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);

  // Keep stable refs so socket callbacks never see stale values
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const callStatusRef = useRef(callStatus);
  callStatusRef.current = callStatus;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;

  // ─── Fade-in + pulse on mount ───────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    const mkPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.55, duration: 1100, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ]),
      );
    const a1 = mkPulse(pulse1, 0);
    const a2 = mkPulse(pulse2, 550);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [fadeAnim, pulse1, pulse2]);

  // ─── Duration timer ─────────────────────────────────────────────
  useEffect(() => {
    if (callStatus !== 'active') return;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [callStatus]);

  // ─── Watch ended status → navigate back ────────────────────────
  useEffect(() => {
    if (callStatus === 'ended') {
      webrtcService.cleanup();
      setTimeout(() => {
        // Safe navigation logic
        if (router.canGoBack()) {
          try {
            router.back();
          } catch {
            router.replace('/(tabs)');
          }
        } else {
          router.replace('/(tabs)');
        }
      }, 500);
    }
  }, [callStatus, router]);

  // ─── Hang up helper ────────────────────────────────────────────
  const handleHangup = useCallback(() => {
    endCall();
    webrtcService.cleanup();
    if (router.canGoBack()) {
      try {
        router.back();
      } catch {
        router.replace('/(tabs)');
      }
    } else {
      router.replace('/(tabs)');
    }
  }, [endCall, router]);

  // ─── Global socket events: answer + ICE ───────────────────────
  useEffect(() => {
    const onAnswer = async ({ callId, answer }: any) => {
      console.log('[Socket] Received webrtc_answer for', callId);
      if (callId !== activeCallRef.current?.callId) return;
      try {
        await webrtcService.setRemoteDescription(answer);
      } catch (e) {
        console.error('[WebRTC] setRemoteDescription(answer):', e);
      }
    };

    const onIce = async ({ callId, candidate }: any) => {
      console.log('[Socket] Received webrtc_ice_candidate');
      if (callId !== activeCallRef.current?.callId) return;
      try {
        await webrtcService.addIceCandidate(candidate);
      } catch (e) {
        console.error('[WebRTC] addIceCandidate:', e);
      }
    };

    socketService.on('webrtc_answer', onAnswer);
    socketService.on('webrtc_ice_candidate', onIce);
    return () => {
      socketService.off('webrtc_answer', onAnswer);
      socketService.off('webrtc_ice_candidate', onIce);
    };
  }, []);

  // ─── Init WebRTC ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall) return;
    let mounted = true;

    const onAccepted = async ({ callId }: any) => {
      console.log('[Socket] Received call_accepted for', callId);
      if (!mounted) return;
      if (callId !== activeCallRef.current?.callId) return;
      try {
        const offer = await webrtcService.createOffer();
        console.log('[WebRTC] Created offer, emitting...');
        socketService.emit('webrtc_offer', {
          callId,
          targetUserId: activeCallRef.current?.remoteUserId,
          offer,
        });
        setCallStatus('connecting');
      } catch (e) {
        console.error('[WebRTC] createOffer:', e);
      }
    };

    const onOffer = async ({ callId, offer }: any) => {
      console.log('[Socket] Received webrtc_offer for', callId);
      if (!mounted) return;
      if (callId !== activeCallRef.current?.callId) return;
      try {
        await webrtcService.setRemoteDescription(offer);
        const answer = await webrtcService.createAnswer();
        console.log('[WebRTC] Created answer, emitting...');
        socketService.emit('webrtc_answer', {
          callId,
          targetUserId: activeCallRef.current?.remoteUserId,
          answer,
        });
      } catch (e) {
        console.error('[WebRTC] handle offer:', e);
      }
    };

    const init = async () => {
      if (webrtcService.isInitializing) {
        return;
      }

      webrtcService.isInitializing = true;
      console.log('[WebRTC] Starting init for', activeCall.callId);
      
      try {
        // 1. Acquire local media
        await webrtcService.acquireLocalStream(activeCall.callId, activeCall.callType);

        // 2. Create peer connection
        webrtcService.createPeerConnection(activeCall.callId);

        // 3. Callbacks
        wireCallbacks();

        // 4. Outgoing: wait for call_accepted → send offer
        if (activeCall.isOutgoing) {
          socketService.on('call_accepted', onAccepted);
        }

        // 5. Incoming: wait for webrtc_offer → send answer
        if (!activeCall.isOutgoing) {
          socketService.on('webrtc_offer', onOffer);
          socketService.emit('call_accept', {
            callId: activeCall.callId,
            callerId: activeCall.remoteUserId,
            accepterName: user?.fullName,
            accepterAvatar: user?.avatar,
          });
        }
      } catch (e: any) {
        console.error('[WebRTC] init:', e);
        Alert.alert('Lỗi', 'Không thể truy cập camera / microphone');
        if (mounted) setCallStatus('ended');
      }
    };

    const wireCallbacks = () => {
      webrtcService.onIceCandidate = (candidate) => {
        const call = activeCallRef.current;
        if (!call) return;
        socketService.emit('webrtc_ice_candidate', {
          callId: call.callId,
          targetUserId: call.remoteUserId,
          candidate,
        });
      };
      webrtcService.onConnectionStateChange = (state) => {
        console.log('[WebRTC] state →', state);
        if (state === 'connected' && mounted) setCallStatus('active');
        if ((state === 'failed' || state === 'closed') && mounted) setCallStatus('ended');
      };
    };

    init();
    return () => {
      mounted = false;
      socketService.off('call_accepted', onAccepted);
      socketService.off('webrtc_offer', onOffer);
    };
  }, [activeCall, setCallStatus, user?.fullName, user?.avatar]);

  // ─── Controls ──────────────────────────────────────────────────
  const toggleMute = () => {
    setIsMuted((m) => {
      webrtcService.setMuted(!m);
      return !m;
    });
  };

  // ─── Display helpers ───────────────────────────────────────────
  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusLabel = () => {
    if (callStatus === 'calling') return 'Đang gọi...';
    if (callStatus === 'connecting') return 'Đang kết nối...';
    if (callStatus === 'active') return fmt(duration);
    if (callStatus === 'ended') return 'Đã kết thúc';
    return '';
  };

  const remoteName = activeCall?.remoteName || '';
  const avatarUrl = getAvatarUrl(activeCall?.remoteAvatar);
  const initials = getInitials(remoteName);

  if (!activeCall) return null;

  // ─────────────────────── RENDER ───────────────────────────────
  return (
    <View className="flex-1 bg-[#1a4e9d]">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View className="absolute inset-0 bg-[#1E40AF]" />

      {/* Gradient overlay for text readability */}
      <View className="absolute inset-0 bg-black/10" pointerEvents="none" />

      <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
        {/* ── Top bar ── */}
        <View className="flex-row items-center justify-between px-4 pb-2" style={{ paddingTop: insets.top + 6 }}>
          <TouchableOpacity className="w-[44px] h-[44px] items-center justify-center" onPress={handleHangup}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-bold tracking-[0.3px]">
            DiskordMes
          </Text>
          <TouchableOpacity className="w-[44px] h-[44px] items-center justify-center">
            <Ionicons name="videocam" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Voice call center (Avatar) ── */}
          <View className="flex-1 items-center justify-center pb-10">
            {/* Pulsing rings */}
            <View className="w-[260px] h-[260px] items-center justify-center mb-10">
              {[pulse2, pulse1].map((p, i) => (
                <Animated.View
                  key={i}
                  className="absolute bg-blue-500"
                  style={[
                    {
                      width: AVATAR_SIZE + 48 + i * 32,
                      height: AVATAR_SIZE + 48 + i * 32,
                      borderRadius: (AVATAR_SIZE + 48 + i * 32) / 2,
                      transform: [{ scale: p }],
                      opacity: p.interpolate({
                        inputRange: [1, 1.55],
                        outputRange: [0.28 - i * 0.08, 0],
                      }),
                    },
                  ]}
                />
              ))}
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-[140px] h-[140px] rounded-[70px] border-[3px] border-white/90" />
              ) : (
                <View className="w-[140px] h-[140px] rounded-[70px] border-[3px] border-white/90 bg-blue-600 items-center justify-center">
                  <Text className="text-white text-[36px] font-bold">{initials}</Text>
                </View>
              )}
            </View>

            <Text 
              className="text-white text-[28px] font-bold mb-2 text-center"
              style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}
            >
              {remoteName}
            </Text>
            <Text className={`text-white/60 text-base font-medium tracking-[0.5px] ${callStatus === 'active' ? 'text-[#4ade80] font-bold text-xl' : ''}`}>
              {statusLabel()}
            </Text>
          </View>

        {/* ── Controls ── */}
        <View className="px-5 pt-4" style={{ paddingBottom: insets.bottom + 40 }}>
          <View className="flex-row justify-evenly items-end py-5 px-2">
            {/* Speaker */}
            <ControlBtn
              icon={isSpeakerOn ? 'volume-high' : 'volume-mute'}
              label="Loa"
              active={isSpeakerOn}
              onPress={() => setIsSpeakerOn((s) => !s)}
            />

            {/* End call */}
            <ControlBtn
              icon="call"
              label="Kết thúc"
              variant="end"
              iconRotate="135deg"
              onPress={handleHangup}
            />

            {/* Mute mic */}
            <ControlBtn
              icon={isMuted ? 'mic-off' : 'mic'}
              label="Micro"
              active={isMuted}
              onPress={toggleMute}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Control Button Component ──────────────────────────────────────
function ControlBtn({
  icon,
  label,
  onPress,
  active,
  variant,
  iconRotate,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  active?: boolean;
  variant?: 'end';
  iconRotate?: string;
}) {
  const isEnd = variant === 'end';
  
  let bgClass = "bg-[rgba(255,255,255,0.14)]";
  if (isEnd) bgClass = "bg-red-500";
  else if (active) bgClass = "bg-[rgba(255,255,255,0.32)]";

  return (
    <View className="items-center gap-2 min-w-[70px]">
      <TouchableOpacity
        className={`w-[72px] h-[72px] rounded-[36px] items-center justify-center ${bgClass}`}
        style={
          isEnd ? {
            shadowColor: '#ef4444',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 8,
          } : undefined
        }
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Ionicons
          name={icon}
          size={isEnd ? 32 : 28}
          color="#fff"
          style={iconRotate ? { transform: [{ rotate: iconRotate }] } : undefined}
        />
      </TouchableOpacity>
      <Text className="text-[rgba(255,255,255,0.65)] text-xs font-medium text-center">{label}</Text>
    </View>
  );
}

