import { useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
/** Fallback khi chưa từng mở bàn phím */
const DEFAULT_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.35);

/**
 * Track keyboard height theo frame (SharedValue) và cache giá trị JS cuối cùng khi > 0.
 * Chiều cao cached này dùng làm chiều cao cố định cho GallerySheet và ComposerActionsSheet.
 */
export function useKeyboardSheetHeight() {
  /** Animated SharedValue: cập nhật liên tục khi keyboard animate */
  const keyboardHeight = useSharedValue(0);

  /**
   * JS-side cache: chiều cao bàn phím lần cuối cùng khi đã settle > 0.
   * Được dùng làm sheet height khi mở gallery/composer sheet.
   */
  const [lastKeyboardHeight, setLastKeyboardHeight] = useState(DEFAULT_SHEET_HEIGHT);
  const lastKeyboardHeightRef = useRef(DEFAULT_SHEET_HEIGHT);

  const updateLastHeight = (h: number) => {
    if (h > 0) {
      lastKeyboardHeightRef.current = h;
      setLastKeyboardHeight(h);
    }
  };

  useKeyboardHandler(
    {
      onStart: (event) => {
        'worklet';
        keyboardHeight.value = event.height;
      },
      onMove: (event) => {
        'worklet';
        keyboardHeight.value = event.height;
      },
      onEnd: (event) => {
        'worklet';
        keyboardHeight.value = event.height;
        if (event.height > 0) {
          runOnJS(updateLastHeight)(event.height);
        }
      },
    },
    []
  );

  return {
    keyboardHeight,
    lastKeyboardHeight,
    lastKeyboardHeightRef,
  };
}
