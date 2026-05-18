import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCall } from '@/context/callContext';

const CALL_SCREENS = ['/call', '/videoCall', '/groupCall'];
export const BAR_CONTENT_HEIGHT = 24;

export default function ActiveCallBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { activeCall, callStatus, callDuration, restoreCall } = useCall();

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  const isActive = callStatus === 'active';
  const isOnCallScreen = CALL_SCREENS.some((s) => pathname.startsWith(s));
  const hasActiveCall =
    !!activeCall && ['calling', 'connecting', 'active', 'incoming'].includes(callStatus);
  const shouldShow = hasActiveCall && !isOnCallScreen;

  // total visual height = safe-area top + content strip
  const fullHeight = insets.top + BAR_CONTENT_HEIGHT;

  // blink for non-active
  useEffect(() => {
    if (isActive) { blinkAnim.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isActive, blinkAnim]);

  // animate height (absolute overlay – layout not affected)
  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: shouldShow ? fullHeight : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [shouldShow, fullHeight, heightAnim]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const label =
    callStatus === 'calling'    ? 'Đang gọi...'     :
    callStatus === 'connecting' ? 'Đang kết nối...' :
    callStatus === 'incoming'   ? 'Cuộc gọi đến...' :
    callStatus === 'active'     ? fmt(callDuration)  : '';

  const handlePress = () => {
    restoreCall();
    if (!activeCall) return;
    if (activeCall.isGroupCall)               router.push('/groupCall' as any);
    else if (activeCall.callType === 'video')  router.push('/videoCall' as any);
    else                                       router.push('/call' as any);
  };

  return (
    <Animated.View
      style={[styles.bar, { height: heightAnim, overflow: 'hidden' }]}
      pointerEvents={shouldShow ? 'box-none' : 'none'}
    >
      <TouchableOpacity
        style={[styles.inner, { paddingTop: insets.top }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Ionicons name="call" size={12} color="#fff" />
        <Animated.Text style={[styles.text, { opacity: blinkAnim }]} numberOfLines={1}>
          {activeCall?.remoteName || 'Cuộc gọi'}{' • '}{label}
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#16a34a',
    zIndex: 9999,
    elevation: 20,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
});
