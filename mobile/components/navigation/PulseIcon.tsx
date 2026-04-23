import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

interface PulseIconProps {
  active?: boolean;
  children: React.ReactNode;
}

const PulseIcon = ({ active, children }: PulseIconProps) => {
  const scale1 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (active) {
      opacity1.setValue(0.35);
      opacity2.setValue(0.22);
      scale1.setValue(1);
      scale2.setValue(1);

      animation = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale1, {
              toValue: 1.75,
              duration: 1050,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale1, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(280),
            Animated.timing(scale2, {
              toValue: 1.95,
              duration: 1100,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale2, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity1, {
              toValue: 0,
              duration: 1050,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(opacity1, {
              toValue: 0.35,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(280),
            Animated.timing(opacity2, {
              toValue: 0,
              duration: 1100,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(opacity2, {
              toValue: 0.22,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      animation.start();
    } else {
      scale1.setValue(1);
      opacity1.setValue(0);
      scale2.setValue(1);
      opacity2.setValue(0);
    }

    return () => {
      animation?.stop();
    };
  }, [active, opacity1, opacity2, scale1, scale2]);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {active ? (
        <Animated.View
          style={{
            position: 'absolute',
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 2,
            borderColor: 'rgba(37, 99, 235, 0.22)',
            backgroundColor: 'transparent',
            transform: [{ scale: scale2 }],
            opacity: opacity2,
          }}
        />
      ) : null}
      {active ? (
        <Animated.View
          style={{
            position: 'absolute',
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: 'rgba(37, 99, 235, 0.35)',
            backgroundColor: 'transparent',
            transform: [{ scale: scale1 }],
            opacity: opacity1,
          }}
        />
      ) : null}
      {children}
    </View>
  );
};

export default PulseIcon;
