import React from 'react';
import {View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress?: number; // 0-1
  color?: string;
  backgroundColor?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 80,
  strokeWidth = 4,
  progress = 0,
  color = '#0084FF',
  backgroundColor = 'rgba(255,255,255,0.2)',
}) => {
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedProgress * circumference);


  return (
    <View style={{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring, rotated to start from top */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
};

export default CircularProgress;
