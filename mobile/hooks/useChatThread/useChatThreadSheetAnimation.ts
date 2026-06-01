import { useEffect, useMemo, useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useKeyboardSheetHeight } from '../useKeyboardSheetHeight';

const SPRING_CONFIG = {
  damping: 500,
  stiffness: 2000,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

interface UseChatThreadSheetAnimationParams {
  composerVisible: boolean;
  galleryVisible: boolean;
  emojiVisible: boolean;
  micVisible: boolean;
  gifVisible: boolean;
  inputRef: React.RefObject<any>;
}

export function useChatThreadSheetAnimation({
  composerVisible,
  galleryVisible,
  emojiVisible,
  micVisible,
  gifVisible,
  inputRef,
}: UseChatThreadSheetAnimationParams) {
  const safeInsets = useSafeAreaInsets();
  const insets = useMemo(
    () => ({
      top: safeInsets.top || initialWindowMetrics?.insets.top || 0,
      bottom: safeInsets.bottom || initialWindowMetrics?.insets.bottom || 0,
      left: safeInsets.left || initialWindowMetrics?.insets.left || 0,
      right: safeInsets.right || initialWindowMetrics?.insets.right || 0,
    }),
    [safeInsets],
  );

  const { keyboardHeight, lastKeyboardHeight } = useKeyboardSheetHeight();
  const sheetHeightSV = useSharedValue(0);
  /** Fixed sheet height (lastKeyboardHeight) nhưng ở dạng SharedValue để dùng trong worklet */
  const fixedSheetHeightSV = useSharedValue(lastKeyboardHeight);
  const sheetTimeoutRef = useRef<any>(null);

  // Đồng bộ lastKeyboardHeight vào fixedSheetHeightSV mỗi khi thay đổi
  useEffect(() => {
    fixedSheetHeightSV.value = lastKeyboardHeight;
  }, [lastKeyboardHeight, fixedSheetHeightSV]);

  useEffect(() => {
    if (sheetTimeoutRef.current) {
      clearTimeout(sheetTimeoutRef.current);
      sheetTimeoutRef.current = null;
    }

    const isAnySheetVisible =
      composerVisible || galleryVisible || emojiVisible || micVisible || gifVisible;
    const focused = !!inputRef.current?.isFocused();
    if (isAnySheetVisible) {
      // Keyboard→sheet: set immediately so padding is maintained by sheetHeightSV
      // while keyboard dismiss animates keyboardHeight.value → 0.
      // Otherwise both values cross mid-animation → padding dips → chat bar jumps.
      if (focused) {
        sheetHeightSV.value = lastKeyboardHeight;
      } else {
        sheetHeightSV.value = withSpring(lastKeyboardHeight, SPRING_CONFIG);
      }
    } else if (focused) {
      // Sheet→keyboard: đợi keyboard animation hoàn tất (~300ms) trước khi giảm
      // sheetHeightSV xuống 0. Nếu giảm sớm hơn, keyboard chưa kịp dâng lên →
      // padding = max(keyboard.đang_dâng, sheet.đang_tụt) → bị tụt → thanh chat giật.
      sheetTimeoutRef.current = setTimeout(() => {
        sheetHeightSV.value = withSpring(0, SPRING_CONFIG);
      }, 300);
    } else {
      sheetHeightSV.value = withSpring(0, SPRING_CONFIG);
    }
  }, [
    composerVisible,
    galleryVisible,
    emojiVisible,
    micVisible,
    gifVisible,
    lastKeyboardHeight,
    sheetHeightSV,
    inputRef,
  ]);

  // Padding cho keyboard + sheet (kết hợp max)
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: Math.max(insets.bottom, keyboardHeight.value, sheetHeightSV.value),
    };
  }, [insets.bottom]);

  // Sheet absolute ở bottom, translateY trượt từ dưới lên
  // translateY = fixedSheetHeight - sheetHeightSV
  // Khi sheetHeightSV=0: translateY = fixedSheetHeight → sheet ở dưới màn hình (hidden)
  // Khi sheetHeightSV=fixedSheetHeight: translateY = 0 → sheet ở vị trí tự nhiên (visible)
  const animatedSheetStyle = useAnimatedStyle(() => {
    const hiddenTranslateY = fixedSheetHeightSV.value - sheetHeightSV.value;
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: fixedSheetHeightSV.value,
      transform: [{ translateY: hiddenTranslateY }],
    };
  });

  return {
    insets,
    lastKeyboardHeight,
    sheetHeightSV,
    animatedContentStyle,
    animatedSheetStyle,
  };
}
