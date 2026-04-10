import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  Alert,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCall } from '@/context/callContext';
import { webrtcService } from '@/services/webrtc';
import { socketService } from '@/services/socket';

const LOCAL_W = 108;
const LOCAL_H = 160;
const AVATAR_SIZE = 100;

export default function CallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeCall, callStatus, endCall, setCallStatus } = useCall();

  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
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
      setTimeout(() => router.back(), 400);
    }
  }, [callStatus, router]);

  // ─── Hang up helper ────────────────────────────────────────────
  const handleHangup = useCallback(() => {
    endCall();
    webrtcService.cleanup();
    router.back();
  }, [endCall, router]);

  // ─── Global socket events: answer + ICE ───────────────────────
  useEffect(() => {
    const onAnswer = async ({ callId, answer }: any) => {
      if (callId !== activeCallRef.current?.callId) return;
      try {
        await webrtcService.setRemoteDescription(answer);
      } catch (e) {
        console.error('[WebRTC] setRemoteDescription(answer):', e);
      }
    };

    const onIce = async ({ callId, candidate }: any) => {
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

    const init = async () => {
      try {
        // 1. Acquire local media
        const ls = await webrtcService.acquireLocalStream(activeCall.callType);
        if (mounted) setLocalStreamURL((ls as any).toURL());

        // 2. Create peer connection
        webrtcService.createPeerConnection();

        // 3. Callbacks
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

        // 4. Outgoing: wait for call_accepted → send offer
        if (activeCall.isOutgoing) {
          const onAccepted = async ({ callId }: any) => {
            if (callId !== activeCallRef.current?.callId) return;
            try {
              const offer = await webrtcService.createOffer();
              socketService.emit('webrtc_offer', {
                callId,
                targetUserId: activeCallRef.current?.remoteUserId,
                offer,
              });
              if (mounted) setCallStatus('connecting');
            } catch (e) {
              console.error('[WebRTC] createOffer:', e);
            }
            socketService.off('call_accepted', onAccepted);
          };
          socketService.on('call_accepted', onAccepted);
        }

        // 5. Incoming: wait for webrtc_offer → send answer
        if (!activeCall.isOutgoing) {
          const onOffer = async ({ callId, offer }: any) => {
            if (callId !== activeCallRef.current?.callId) return;
            try {
              await webrtcService.setRemoteDescription(offer);
              const answer = await webrtcService.createAnswer();
              socketService.emit('webrtc_answer', {
                callId,
                callerId: activeCallRef.current?.remoteUserId,
                answer,
              });
            } catch (e) {
              console.error('[WebRTC] handle offer:', e);
            }
            socketService.off('webrtc_offer', onOffer);
          };
          socketService.on('webrtc_offer', onOffer);
        }
      } catch (e: any) {
        console.error('[WebRTC] init:', e);
        Alert.alert('Lỗi', 'Không thể truy cập camera / microphone');
        if (mounted) setCallStatus('ended');
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [activeCall, setCallStatus]);

  // ─── Controls ──────────────────────────────────────────────────
  const toggleMute = () => {
    setIsMuted((m) => {
      webrtcService.setMuted(!m);
      return !m;
    });
  };

  const toggleCamera = () => {
    setIsCameraOn((on) => {
      webrtcService.setCameraEnabled(!on);
      return !on;
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

  const isVideo = activeCall?.callType === 'video';
  const remoteName = activeCall?.remoteName || '';
  const remoteAvatar = activeCall?.remoteAvatar;
  const initials = remoteName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (!activeCall) return null;

  // ─────────────────────── RENDER ───────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Background ── */}
      {isVideo && remoteStreamURL ? (
        <RTCView
          streamURL={remoteStreamURL}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          zOrder={0}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.voiceBg]} />
      )}

      {/* Gradient overlay for text readability */}
      <View style={styles.overlayGradient} pointerEvents="none" />

      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        {/* ── Top bar ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity style={styles.chevronBtn} onPress={handleHangup}>
            <Ionicons name="chevron-down" size={30} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <Text style={styles.callTypeLbl}>
            {isVideo ? '📹  Gọi video' : '📞  Gọi thoại'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Voice call center ── */}
        {!isVideo && (
          <View style={styles.voiceCenter}>
            {/* Pulsing rings */}
            <View style={styles.pulseWrap}>
              {[pulse2, pulse1].map((p, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.ring,
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
              {remoteAvatar ? (
                <Image source={{ uri: remoteAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>

            <Text style={styles.remoteName}>{remoteName}</Text>
            <Text style={styles.statusLbl}>{statusLabel()}</Text>
          </View>
        )}

        {/* ── Video call top info overlay ── */}
        {isVideo && (
          <View style={styles.videoInfo}>
            <Text style={styles.remoteName}>{remoteName}</Text>
            <Text style={styles.statusLbl}>{statusLabel()}</Text>
          </View>
        )}

        {/* ── Local video tile (video call) ── */}
        {isVideo && localStreamURL && (
          <View style={[styles.localVideo, { top: insets.top + 80 }]}>
            <RTCView
              streamURL={localStreamURL}
              style={StyleSheet.absoluteFill}
              objectFit="cover"
              zOrder={1}
              mirror
            />
            {!isCameraOn && (
              <View style={styles.camOffOverlay}>
                <Ionicons name="videocam-off" size={20} color="#fff" />
              </View>
            )}
          </View>
        )}

        {/* ── Controls ── */}
        <View style={[styles.controlsBar, { paddingBottom: insets.bottom + 28 }]}>
          <View style={styles.controlRow}>
            {/* Mute mic */}
            <ControlBtn
              icon={isMuted ? 'mic-off' : 'mic'}
              label={isMuted ? 'Bật mic' : 'Tắt mic'}
              active={isMuted}
              onPress={toggleMute}
            />

            {/* Flip camera (video) or speaker (voice) */}
            {isVideo ? (
              <ControlBtn
                icon="camera-reverse"
                label="Lật cam"
                onPress={() => webrtcService.flipCamera()}
              />
            ) : (
              <ControlBtn
                icon={isSpeakerOn ? 'volume-high' : 'volume-mute'}
                label="Loa"
                active={isSpeakerOn}
                onPress={() => setIsSpeakerOn((s) => !s)}
              />
            )}

            {/* End call */}
            <ControlBtn
              icon="call"
              label="Kết thúc"
              variant="end"
              iconRotate="135deg"
              onPress={handleHangup}
            />

            {/* Camera toggle (video) */}
            {isVideo && (
              <ControlBtn
                icon={isCameraOn ? 'videocam' : 'videocam-off'}
                label={isCameraOn ? 'Tắt cam' : 'Bật cam'}
                active={!isCameraOn}
                onPress={toggleCamera}
              />
            )}
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
  return (
    <View style={styles.ctrlItem}>
      <TouchableOpacity
        style={[
          styles.ctrlBtn,
          isEnd ? styles.ctrlEnd : active ? styles.ctrlActive : styles.ctrlDefault,
        ]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Ionicons
          name={icon}
          size={isEnd ? 28 : 24}
          color="#fff"
          style={iconRotate ? { transform: [{ rotate: iconRotate }] } : undefined}
        />
      </TouchableOpacity>
      <Text style={styles.ctrlLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────── STYLES ───────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d1117' },
  flex: { flex: 1 },
  voiceBg: {
    backgroundColor: '#0d1117',
    // slight radial-like effect via nested views below
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chevronBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTypeLbl: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Voice call center
  voiceCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  pulseWrap: {
    width: AVATAR_SIZE + 100,
    height: AVATAR_SIZE + 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
    backgroundColor: '#3b82f6',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  avatarFallback: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  remoteName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusLbl: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // Video call info
  videoInfo: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'flex-start',
  },

  // Local video tile
  localVideo: {
    position: 'absolute',
    right: 16,
    width: LOCAL_W,
    height: LOCAL_H,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  camOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Controls bar
  controlsBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ctrlItem: {
    alignItems: 'center',
    gap: 8,
    minWidth: 70,
  },
  ctrlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlDefault: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  ctrlActive: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  ctrlEnd: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  ctrlLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
