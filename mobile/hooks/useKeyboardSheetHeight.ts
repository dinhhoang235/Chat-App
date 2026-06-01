import { useEffect, useRef, useState } from 'react';
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

  /** Track whether keyboard is currently visible or was recently dismissed */
  const keyboardVisibleRef = useRef(false);
  const keyboardVisibleTimeoutRef = useRef<any>(null);
  /** Bỏ qua keyboard event đầu tiên khi mount (Android gửi height > 0 ngay lúc init) */
  const hasSeenDismissRef = useRef(false);

  const setKeyboardVisible = (visible: boolean) => {
    if (visible) {
      if (keyboardVisibleTimeoutRef.current) {
        clearTimeout(keyboardVisibleTimeoutRef.current);
        keyboardVisibleTimeoutRef.current = null;
      }
      keyboardVisibleRef.current = true;
    } else {
      hasSeenDismissRef.current = true;
      // Delay setting to false to handle keyboard→sheet transitions
      keyboardVisibleTimeoutRef.current = setTimeout(() => {
        keyboardVisibleRef.current = false;
      }, 500);
    }
  };

  const maybeSetKeyboardVisible = (visible: boolean) => {
    // Lần đầu tiên (mount) — Android gửi height > 0 dù keyboard chưa mở.
    // Bỏ qua — useEffect đã reset keyboardHeight về 0 khi mount.
    // Không được reset keyboardHeight ở đây vì real keyboard có thể đã mở
    // trước khi callback này chạy (race), gây mất padding.
    if (visible && !hasSeenDismissRef.current) {
      return;
    }
    setKeyboardVisible(visible);
  };

  const updateLastHeight = (h: number) => {
    if (h > 0) {
      lastKeyboardHeightRef.current = h;
      setLastKeyboardHeight(h);
    }
  };

  // Reset keyboardHeight về 0 sau mount (Android init event có thể set height > 0
  // dù keyboard chưa mở, gây giật padding khi mở sheet lần đầu).
  // Dùng requestAnimationFrame để bắt các init event fire sau useEffect (async native emitter).
  useEffect(() => {
    keyboardHeight.value = 0;
    requestAnimationFrame(() => {
      keyboardHeight.value = 0;
    });
  }, [keyboardHeight]);

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
          runOnJS(maybeSetKeyboardVisible)(true);
        } else {
          runOnJS(setKeyboardVisible)(false);
        }
      },
    },
    []
  );

  return {
    keyboardHeight,
    lastKeyboardHeight,
    lastKeyboardHeightRef,
    keyboardVisibleRef,
  };
}
