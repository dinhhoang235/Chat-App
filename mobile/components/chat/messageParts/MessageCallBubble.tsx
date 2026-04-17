import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';

type MessageCallBubbleProps = {
  message: any;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onCallAction?: (message: any, callData: any) => void;
  isGroupThread?: boolean;
  colors: any;
};

const formatDuration = (seconds?: number) => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '--:--';
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60).toString().padStart(2, '0');
  const remaining = (rounded % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

export default function MessageCallBubble({
  message,
  onVoiceCall,
  onVideoCall,
  onCallAction,
  isGroupThread,
  colors,
}: MessageCallBubbleProps) {
  let callData: any = { callType: 'voice', status: 'completed', duration: 0 };
  try {
    callData = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
  } catch (e) {
    console.error('Error parsing call data', e);
  }

  const isVideo = callData.callType === 'video';
  const isGroupCall = Boolean(
    isGroupThread ||
    callData.isGroupCall ||
    (Array.isArray(callData.groupTargets) && callData.groupTargets.length > 2) ||
    (Array.isArray(callData.targetUserIds) && callData.targetUserIds.length > 1)
  );
  const isStarted = callData.status === 'started';
  const isMissed = callData.status === 'missed' || callData.status === 'rejected' || callData.status === 'no_answer';
  const isEndedGroupCall = isGroupCall && (isMissed || callData.status === 'completed');

  let label = '';
  if (isStarted && isGroupCall) {
    label = 'Cuộc gọi nhóm';
  } else if (isEndedGroupCall) {
    label = 'Cuộc gọi nhóm đã kết thúc';
  } else if (!isGroupCall && (callData.status === 'missed' || callData.status === 'no_answer')) {
    label = message.fromMe ? 'Bạn đã hủy' : 'Cuộc gọi lỡ';
  } else if (!isGroupCall && callData.status === 'rejected') {
    label = 'Cuộc gọi bị từ chối';
  } else {
    label = isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
    if (callData.duration > 0) {
      label += ` (${formatDuration(callData.duration)})`;
    }
  }

  const iconColor = message.fromMe ? '#FFFFFF' : (isMissed ? '#FF3B30' : colors.tint);
  const iconBg = message.fromMe ? 'rgba(255,255,255,0.18)' : (isMissed ? 'rgba(255, 59, 48, 0.08)' : 'rgba(0, 122, 255, 0.08)');
  const subTextColor = message.fromMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary;

  if (isEndedGroupCall) {
    return (
      <View className="w-full items-center my-2">
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surfaceVariant, maxWidth: '84%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="video" size={16} color={colors.tint} style={{ marginRight: 8 }} />
          <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' }}>
            {label}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingVertical: 2, minWidth: 180 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12
        }}>
          {isMissed ? (
            isVideo ? (
              <MaterialIcons name="missed-video-call" size={24} color={iconColor} />
            ) : (
              <Feather name="phone-missed" size={22} color={iconColor} />
            )
          ) : isVideo ? (
            <Feather name="video" size={22} color={iconColor} />
          ) : (
            <Ionicons name="call-outline" size={22} color={iconColor} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: message.fromMe ? '#FFFFFF' : colors.text, fontWeight: '600', fontSize: 15 }}>{label}</Text>
          <Text style={{ color: subTextColor, fontSize: 12, marginTop: 2 }}>
            {isVideo ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          if (isGroupCall) {
            onCallAction?.(message, callData);
          } else {
            if (isVideo) {
              onVideoCall?.();
            } else {
              onVoiceCall?.();
            }
          }
        }}
        style={{
          borderTopWidth: 1,
          borderTopColor: message.fromMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
          marginTop: 8,
          paddingTop: 8,
          alignItems: 'center'
        }}
        activeOpacity={0.7}
      >
        <Text style={{
          color: message.fromMe ? '#FFFFFF' : '#007AFF',
          fontWeight: '700',
          fontSize: 12,
          letterSpacing: 0.3
        }}>
          {isGroupCall ? 'THAM GIA' : 'GỌI LẠI'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
