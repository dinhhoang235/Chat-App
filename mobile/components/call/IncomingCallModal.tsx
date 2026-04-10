import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCall } from '@/context/callContext';

const { width } = Dimensions.get('window');
const AVATAR_SIZE = 90;

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
  const initials = (incomingCall.remoteName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Modal
      visible={!!incomingCall}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Background blur-like layer */}
        <View style={[styles.backdrop, { backgroundColor: 'rgba(10,15,30,0.92)' }]} />

        <View style={styles.container}>
          {/* Call type badge */}
          <View style={styles.badgeRow}>
            <Ionicons
              name={isVideo ? 'videocam' : 'call'}
              size={16}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.badgeText}>
              {isVideo ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
            </Text>
          </View>

          {/* Pulsing avatar */}
          <View style={styles.avatarWrapper}>
            {[pulse3, pulse2, pulse1].map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.pulseRing,
                  {
                    width: AVATAR_SIZE + 24 + i * 20,
                    height: AVATAR_SIZE + 24 + i * 20,
                    borderRadius: (AVATAR_SIZE + 24 + i * 20) / 2,
                    transform: [{ scale: p }],
                    opacity: p.interpolate({
                      inputRange: [1, 1.6],
                      outputRange: [0.35 - i * 0.08, 0],
                    }),
                  },
                ]}
              />
            ))}
            {incomingCall.remoteAvatar ? (
              <Image
                source={{ uri: incomingCall.remoteAvatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarInitials]}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
          </View>

          {/* Caller name */}
          <Text style={styles.callerName} numberOfLines={1}>
            {incomingCall.remoteName}
          </Text>
          <Text style={styles.statusText}>
            {isVideo ? '📹 Đang gọi video...' : '📞 Đang gọi...'}
          </Text>

          {/* Action buttons */}
          <View style={styles.actions}>
            {/* Reject */}
            <View style={styles.actionItem}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={rejectCall}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Từ chối</Text>
            </View>

            {/* Accept */}
            <View style={styles.actionItem}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={acceptCall}
                activeOpacity={0.8}
              >
                <Ionicons name={isVideo ? 'videocam' : 'call'} size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Chấp nhận</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: width * 0.88,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  avatarWrapper: {
    width: AVATAR_SIZE + 80,
    height: AVATAR_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: '#4ade80',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInitials: {
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  callerName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    marginBottom: 44,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    gap: 48,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
});
