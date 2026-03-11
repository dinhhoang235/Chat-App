import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

type Action = { key: string; icon: string; label: string; color?: string };

const ACTIONS: Action[] = [
  { key: 'location', icon: 'place', label: 'Vị trí', color: '#FB7185' },
  { key: 'document', icon: 'attach-file', label: 'Tài liệu', color: '#6366F1' },
  { key: 'gif', icon: 'gif', label: '@GIF', color: '#34D399' },
];

export default function ComposerActionsSheet({
  visible,
  onClose,
  onAction,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  onAction: (key: string) => void;
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
        <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.key}
                onPress={() => onAction(a.key)}
                style={{ width: '25%', alignItems: 'center', paddingVertical: 10 }}
              >
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: a.color || '#EEE',
                  marginBottom: 8,
                }}>
                  <MaterialIcons name={a.icon as any} size={22} color="#fff" />
                </View>
                <Text style={{ color: colors.text, fontSize: 12, textAlign: 'center' }}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}
