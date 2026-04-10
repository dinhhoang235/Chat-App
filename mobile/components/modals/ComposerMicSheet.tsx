import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

export default function ComposerMicSheet({
  visible,
  onClose,
  onAction,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  onAction?: (key: 'send_audio' | 'send_text') => void;
  height?: number;
}) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => {
    const h = height ?? Math.round(Dimensions.get('window').height * 0.35);
    return [h];
  }, [height]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      handleComponent={null}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      enableDynamicSizing={false}
      containerStyle={{ pointerEvents: 'box-none' }}
    >
      <BottomSheetView>
        <View style={{ paddingTop: 18, paddingBottom: 20, alignItems: 'center' }}>
          <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 26 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 16, marginBottom: 20 }}>
              Bấm hoặc bấm giữ để ghi âm
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                width: 86,
                height: 86,
                borderRadius: 43,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.tint,
              }}
            >
              <MaterialIcons name="mic" size={36} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={{ width: '100%', paddingHorizontal: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surfaceVariant,
                borderRadius: 24,
                padding: 3,
                maxWidth: 420,
                alignSelf: 'center',
              }}
            >
              <TouchableOpacity
                onPress={() => onAction?.('send_audio')}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 38,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Gửi bản ghi âm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAction?.('send_text')}
                style={{
                  flex: 1,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 38,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600' }}>
                  Gửi dạng văn bản
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
