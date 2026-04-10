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
   * - Blur & dismiss keyboard trước khi mở (tránh layout jump).
   * - Nếu đang mở sheet cùng loại → toggle (đóng).
   * - Nếu đang mở sheet khác → swap ngay (không có khoảng trống giữa).
   */
  const openSheet = (type: SheetType) => {
    // Dismiss keyboard (nếu đang mở) — không cần await vì sheet height đã cached
    inputRef.current?.blur?.();
    Keyboard.dismiss();

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
