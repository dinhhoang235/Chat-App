import React from 'react';
import { Keyboard } from 'react-native';

type SheetType = 'gallery' | 'actions' | 'emoji' | 'mic';

/**
 * Quản lý trạng thái mở/đóng của GallerySheet, ComposerActionsSheet, EmojiSheet và ComposerMicSheet.
 *
 * - Chỉ một sheet được mở tại một thời điểm.
 * - Khi chuyển giữa keyboard → sheet (hoặc ngược lại), vùng chat không nhảy
 *   vì `sheetHeight` luôn bằng chiều cao bàn phím cuối cùng.
 * - `lastKeyboardHeight` được truyền từ hook `useKeyboardSheetHeight`.
 */
export default function useSheetControl(
  inputRef: React.RefObject<any>,
  composerVisible: boolean,
  setComposerVisible: React.Dispatch<React.SetStateAction<boolean>>,
  galleryVisible: boolean,
  setGalleryVisible: React.Dispatch<React.SetStateAction<boolean>>,
  emojiVisible: boolean,
  setEmojiVisible: React.Dispatch<React.SetStateAction<boolean>>,
  micVisible: boolean,
  setMicVisible: React.Dispatch<React.SetStateAction<boolean>>,
  lastKeyboardHeight: number
) {
  /**
    * Mở sheet theo loại.
    * - Set visibility state TRƯỚC, dismiss keyboard SAU (qua requestAnimationFrame)
    *   để useChatThreadSheetAnimation kịp set sheetHeight = lastKeyboardHeight
    *   ngay lập tức trước khi keyboardHeight.value giảm về 0.
    * - Nếu đang mở sheet cùng loại → toggle (đóng).
    * - Nếu đang mở sheet khác → swap ngay (không có khoảng trống giữa).
    */
  const openSheet = (type: SheetType) => {
    const wasFocused = !!inputRef.current?.isFocused();
    const isActive = type === 'gallery' ? galleryVisible
      : type === 'emoji' ? emojiVisible
      : type === 'mic' ? micVisible
      : composerVisible;
    if (type === 'gallery') {
      if (composerVisible) setComposerVisible(false);
      if (emojiVisible) setEmojiVisible(false);
      if (micVisible) setMicVisible(false);
      setGalleryVisible(v => !v);
    } else if (type === 'emoji') {
      if (composerVisible) setComposerVisible(false);
      if (galleryVisible) setGalleryVisible(false);
      if (micVisible) setMicVisible(false);
      setEmojiVisible(v => !v);
    } else if (type === 'mic') {
      if (composerVisible) setComposerVisible(false);
      if (galleryVisible) setGalleryVisible(false);
      if (emojiVisible) setEmojiVisible(false);
      setMicVisible(v => !v);
    } else {
      if (galleryVisible) setGalleryVisible(false);
      if (emojiVisible) setEmojiVisible(false);
      if (micVisible) setMicVisible(false);
      setComposerVisible(v => !v);
    }

    if (isActive) {
      // Toggle OFF: đóng sheet + focus text input để hiện bàn phím
      inputRef.current?.focus?.();
    } else if (wasFocused) {
      // Toggle ON từ keyboard: dismiss keyboard sau microtask
      // (để React kịp set sheetHeightSV trước khi keyboardHeight.value giảm)
      Promise.resolve().then(() => {
        if (inputRef.current?.isFocused()) {
          inputRef.current?.blur?.();
          Keyboard.dismiss();
        }
      });
    }
  };

  const closeAll = () => {
    inputRef.current?.blur?.();
    Keyboard.dismiss();
    setComposerVisible(false);
    setGalleryVisible(false);
    setEmojiVisible(false);
    setMicVisible(false);
  };

  return {
    openSheet,
    closeAll,
    sheetHeight: lastKeyboardHeight,
  };
}
