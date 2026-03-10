import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withDelay 
} from 'react-native-reanimated';

const Dot = ({ delay, size = 7 }: { delay: number, size?: number }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(1, { duration: 400 })),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#8E8E93',
          marginHorizontal: 2.5,
        },
        animatedStyle,
      ]}
    />
  );
};

const TypingDots = () => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 20, paddingHorizontal: 4 }}>
      <Dot delay={0} />
      <Dot delay={200} />
      <Dot delay={400} />
    </View>
  );
};

export default TypingDots;
