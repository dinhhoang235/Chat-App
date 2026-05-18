import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SwitchToVideoSheet({
  visible,
  onClose,
  onConfirm,
  onDecline,
  mode = 'request',
  title,
  description,
  confirmLabel,
  declineLabel,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDecline?: () => void;
  mode?: 'request' | 'incoming';
  title?: string;
  description?: string;
  confirmLabel?: string;
  declineLabel?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => [285 + insets.bottom], [insets.bottom]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const defaultTitle = mode === 'request' ? 'Chuyển sang cuộc gọi video?' : 'Lời mời chuyển sang cuộc gọi video';
  const defaultDescription = mode === 'request' 
    ? 'Bạn bè của bạn sẽ nhận được lời mời chuyển sang cuộc gọi video.' 
    : 'Đối phương muốn chuyển cuộc gọi thoại hiện tại sang cuộc gọi video.';
  const defaultConfirmLabel = mode === 'request' ? 'Chuyển' : 'Chấp nhận';
  const defaultDeclineLabel = mode === 'request' ? 'Hủy' : 'Từ chối';

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.textSecondary, width: 40 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
      )}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: insets.bottom + 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <MaterialIcons name="videocam" size={32} color="#3b82f6" />
          </View>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
            {title || defaultTitle}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
            {description || defaultDescription}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 'auto' }}>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 14, backgroundColor: colors.border, borderRadius: 12, alignItems: 'center' }}
            onPress={() => {
              if (onDecline) {
                onDecline();
              }
              onClose();
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
              {declineLabel || defaultDeclineLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 14, backgroundColor: '#3b82f6', borderRadius: 12, alignItems: 'center' }}
            onPress={() => {
              onConfirm();
              onClose();
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
              {confirmLabel || defaultConfirmLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
