import { useEffect, useMemo, useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useKeyboardSheetHeight } from '../useKeyboardSheetHeight';

interface UseChatThreadSheetAnimationParams {
  composerVisible: boolean;
  galleryVisible: boolean;
  emojiVisible: boolean;
  micVisible: boolean;
  inputRef: React.RefObject<any>;
}

export function useChatThreadSheetAnimation({
  composerVisible,
  galleryVisible,
  emojiVisible,
  micVisible,
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
  const sheetTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (sheetTimeoutRef.current) {
      clearTimeout(sheetTimeoutRef.current);
      sheetTimeoutRef.current = null;
    }

    const isAnySheetVisible =
      composerVisible || galleryVisible || emojiVisible || micVisible;
    if (isAnySheetVisible) {
      // Avoid reading sharedValue.value on JS side (Reanimated strict warning).
      const keyboardLikelyOpen = !!inputRef.current?.isFocused();
      if (keyboardLikelyOpen) {
        sheetHeightSV.value = lastKeyboardHeight;
      } else {
        sheetHeightSV.value = withTiming(lastKeyboardHeight, { duration: 333 });
      }
    } else if (inputRef.current?.isFocused()) {
      sheetTimeoutRef.current = setTimeout(() => {
        sheetHeightSV.value = 0;
      }, 350);
    } else {
      sheetHeightSV.value = withTiming(0, { duration: 333 });
    }
  }, [
    composerVisible,
    galleryVisible,
    emojiVisible,
    micVisible,
    lastKeyboardHeight,
    sheetHeightSV,
    inputRef,
  ]);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      paddingBottom: Math.max(
        insets.bottom,
        keyboardHeight.value,
        sheetHeightSV.value,
      ),
    };
  }, [insets.bottom]);

  return {
    insets,
    lastKeyboardHeight,
    animatedContentStyle,
  };
}
