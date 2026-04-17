import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
  Animated
} from 'react-native';
import { RTCView } from '@livekit/react-native-webrtc';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCall } from '@/context/callContext';
import { useAuth } from '@/context/authContext';
import { webrtcService } from '@/services/webrtc';
import { socketService } from '@/services/socket';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';


export default function VideoCallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeCall, callStatus, endCall, setCallStatus } = useCall();
  const { user } = useAuth();

  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [remoteCameraOn, setRemoteCameraOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const isFlippingCamera = useRef(false);

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

  // Keep stable refs so socket callbacks never see stale values
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const callStatusRef = useRef(callStatus);
  callStatusRef.current = callStatus;

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

    const onCameraToggle = ({ userId, enabled }: { userId: number, enabled: boolean }) => {
      console.log('[Socket] Received camera_toggle', enabled, 'from', userId);
      setRemoteCameraOn(enabled);
    };
    
    // Listen for manual track replacement (flipCamera)
    webrtcService.onLocalStreamChanged = (stream: any) => {
      setLocalStreamURL(stream.toURL());
    };

    socketService.on('webrtc_answer', onAnswer);
    socketService.on('webrtc_ice_candidate', onIce);
    socketService.on('camera_toggle', onCameraToggle);
    return () => {
      socketService.off('webrtc_answer', onAnswer);
      socketService.off('webrtc_ice_candidate', onIce);
      socketService.off('camera_toggle', onCameraToggle);
      webrtcService.onLocalStreamChanged = null;
    };
  }, []);

  // ─── Init WebRTC ───────────────────────────────────────────────
  useEffect(() => {
    if (!activeCall) return;
    let mounted = true;

    const onAccepted = async ({ callId, accepterId }: any) => {
      console.log('[Socket] Received call_accepted for', callId, 'from', accepterId);
      if (!mounted) return;
      if (callId !== activeCallRef.current?.callId) return;
      const targetUserId = accepterId ?? activeCallRef.current?.remoteUserId;
      if (!targetUserId) return;
      try {
        const offer = await webrtcService.createOffer();
        console.log('[WebRTC] Created offer, emitting...');
        socketService.emit('webrtc_offer', {
          callId,
          targetUserId,
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
      // 0. Atomic guard against double-init
      if (webrtcService.isInitializing || (webrtcService.currentCallId === activeCall.callId && webrtcService.getLocalStream())) {
        if (webrtcService.currentCallId === activeCall.callId && webrtcService.getLocalStream()) {
          console.log('[WebRTC] Re-wiring callbacks for', activeCall.callId);
          wireCallbacks();
          const ls = webrtcService.getLocalStream();
          if (mounted && ls) setLocalStreamURL((ls as any).toURL());
        }
        return;
      }

      webrtcService.isInitializing = true;
      console.log('[WebRTC] Starting init for', activeCall.callId);
      
      try {
        // 1. Acquire local media
        const ls = await webrtcService.acquireLocalStream(activeCall.callId, activeCall.callType);
        if (mounted) setLocalStreamURL((ls as any).toURL());

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
      webrtcService.onRemoteStream = (stream) => {
        if (mounted) setRemoteStreamURL((stream as any).toURL());
      };
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

  const toggleCamera = () => {
    setIsCameraOn((c) => {
      const nextVal = !c;
      webrtcService.setCameraEnabled(nextVal);
      // Notify remote
      socketService.emit('camera_toggle', {
        callId: activeCall?.callId,
        targetUserId: activeCall?.remoteUserId,
        enabled: nextVal
      });
      return nextVal;
    });
  };

  const flipCamera = async () => {
    if (isFlippingCamera.current) return;
    isFlippingCamera.current = true;
    try {
      await webrtcService.flipCamera();
      setIsFrontCamera(prev => !prev);
    } catch (e) {
      console.warn("Failed to flip camera", e);
    } finally {
      // allow small debounce for camera to catch up
      setTimeout(() => {
        isFlippingCamera.current = false;
      }, 500);
    }
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

  if (!activeCall) return null;

  // ─────────────────────── RENDER ───────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={toggleControls}>
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ── Background Layer: Blue for local-off, Black for others ── */}
        <View className={`absolute inset-0 ${(!remoteStreamURL && !isCameraOn) ? 'bg-[#1E40AF]' : 'bg-black'}`} />

        {/* ── Background Video Layer ── */}
        {(remoteStreamURL && remoteCameraOn) ? (
          <RTCView
            key={`bg-remote`}
            streamURL={remoteStreamURL}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            zOrder={0}
            mirror={false}
          />
        ) : (!remoteStreamURL && localStreamURL && isCameraOn) ? (
          <RTCView
            key={`bg-local`}
            streamURL={localStreamURL}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            zOrder={0}
            mirror={true}
          />
        ) : null}

        {/* ── Avatar Fallback (when remote video is off) ── */}
        {(callStatus === 'active' && remoteStreamURL && !remoteCameraOn) && (
          <View className="absolute inset-0 bg-[#111111] items-center justify-center z-0">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="w-[120px] h-[120px] rounded-[60px] border border-white/20" />
            ) : (
              <View className="w-[120px] h-[120px] rounded-[60px] border border-white/20 bg-[#0A84FF] items-center justify-center">
                <Text className="text-white text-[48px] font-bold">{getInitials(remoteName)}</Text>
              </View>
            )}
            <Text className="text-white text-xl mt-4 opacity-80">Đã tắt camera</Text>
          </View>
        )}

        {/* ── Picture in Picture for Local Camera ── */}
        {remoteStreamURL && localStreamURL && (
          <Animated.View
            className="absolute right-4 rounded-xl overflow-hidden border border-white/20 bg-black/50"
            style={[
              { top: insets.top + 70, width: 110, height: 160 },
              { opacity: controlsOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              { zIndex: 10 }
            ]}
          >
            {isCameraOn ? (
              <RTCView
                streamURL={localStreamURL}
                style={StyleSheet.absoluteFill}
                objectFit="cover"
                mirror={isFrontCamera}
                zOrder={1}
              />
            ) : (
              <View className="flex-1 bg-[#111111] items-center justify-center">
                <Ionicons name="person" size={40} color="#fff" style={{ opacity: 0.3 }} />
                <View className="absolute bottom-2 right-2 bg-black/60 rounded-full p-1 border border-white/10">
                  <Ionicons name="videocam-off" size={12} color="#f87171" />
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── Top Header – fades in/out on tap ── */}
        <Animated.View
          className="absolute top-0 left-0 right-0 px-4 flex-row items-center justify-between"
          style={[{ opacity: controlsOpacity, paddingTop: insets.top + 6 }]}
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
        >
          <TouchableOpacity className="w-[42px] h-[42px] items-center justify-center rounded-full bg-black/25" onPress={handleHangup}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-white text-lg font-bold tracking-wide" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              DiskordMes
            </Text>
            {callStatus === 'active' && (
              <Text className="text-[#4ade80] text-[15px] font-bold" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
                {fmt(duration)}
              </Text>
            )}
          </View>

          <TouchableOpacity className="w-[42px] h-[42px] items-center justify-center rounded-full bg-black/25" onPress={flipCamera} disabled={!isCameraOn}>
            <FontAwesome6 name="arrows-rotate" size={20} color={isCameraOn ? "#fff" : "rgba(255,255,255,0.5)"} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Avatar & Name (Central info, hidden when active) ── */}
        {callStatus !== 'active' && (
          <View className="absolute top-1/4 left-0 right-0 items-center" pointerEvents="none">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="w-[100px] h-[100px] rounded-[50px] border-2 border-white mb-4" />
            ) : (
              <View className="w-[100px] h-[100px] rounded-[50px] border-2 border-white bg-blue-600 items-center justify-center mb-4">
                <Ionicons name="person" size={50} color="#fff" />
              </View>
            )}
            <Text
              className="text-white text-[28px] font-bold text-center mb-2"
              style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 }}
            >
              {remoteName}
            </Text>
            <Text
              className="text-center text-white/90 text-xl font-bold tracking-[0.5px]"
              style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}
            >
              {statusLabel()}
            </Text>
          </View>
        )}

        {/* ── Bottom Controls – fades in/out on tap ── */}
        <Animated.View
          className="absolute bottom-0 left-0 right-0 px-5"
          style={[{ opacity: controlsOpacity, paddingBottom: insets.bottom + 40 }]}
          pointerEvents={controlsVisible ? 'box-none' : 'none'}
        >
          <View className="flex-row justify-between w-full max-w-[340px] self-center items-center">
            <ControlBtn
              icon={isCameraOn ? 'videocam' : 'videocam-off'}
              label="Camera"
              active={isCameraOn}
              onPress={toggleCamera}
            />
            <ControlBtn
              icon={isMuted ? 'mic-off' : 'mic'}
              label="Mic"
              active={!isMuted}
              onPress={toggleMute}
            />
            <ControlBtn
              icon="call"
              label="Kết thúc"
              variant="end"
              iconRotate="135deg"
              onPress={handleHangup}
            />
            <ControlBtn
              icon="ellipsis-horizontal"
              label="Thêm"
              onPress={() => {}}
            />
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
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
  disabled
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
  
  let bgClass = "bg-[rgba(255,255,255,0.14)]";
  if (isEnd) bgClass = "bg-red-500";
  else if (active) bgClass = "bg-white";
  
  const iconColor = active && !isEnd ? "#000" : "#fff";
  const opacityClass = disabled ? "opacity-50" : "opacity-100";

  return (
    <View className={`items-center gap-2 min-w-[75px] ${opacityClass}`}>
      <TouchableOpacity
        className={`w-[64px] h-[64px] rounded-[32px] items-center justify-center ${bgClass}`}
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
        disabled={disabled}
      >
        <Ionicons
          name={icon}
          size={isEnd ? 32 : 24}
          color={iconColor}
          style={iconRotate ? { transform: [{ rotate: iconRotate }] } : undefined}
        />
      </TouchableOpacity>
      <Text 
        className="text-white text-xs font-bold text-center"
        style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}
      >
        {label}
      </Text>
    </View>
  );
}
