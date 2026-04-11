import { useState } from 'react';

export type ThreadAttachment = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

interface UseChatThreadComposerParams {
  handleType: () => void;
}

export function useChatThreadComposer({ handleType }: UseChatThreadComposerParams) {
  const [composerVisible, setComposerVisible] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [micVisible, setMicVisible] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<ThreadAttachment[]>([]);

  const addAttachments = (files: ThreadAttachment[]) => {
    setAttachments((prev) => {
      const combined = [...prev, ...files].slice(0, 10);
      if (combined.length >= 10 && prev.length + files.length > 10) {
        alert('Chỉ có thể gửi tối đa 10 ảnh.');
      }
      return combined;
    });
  };

  const removeAttachment = (arg: number | string) => {
    setAttachments((prev) => {
      if (typeof arg === 'number') {
        return prev.filter((_, i) => i !== arg);
      }
      return prev.filter((a) => a.uri !== arg);
    });
  };

  const clearAttachments = () => setAttachments([]);

  const onTextChange = (text: string) => {
    setMessageText(text);
    handleType();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText((prev) => prev + emoji);
    handleType();
  };

  const handleBackspace = () => {
    setMessageText((prev) => {
      const chars = Array.from(prev);
      if (chars.length === 0) return prev;
      return chars.slice(0, -1).join('');
    });
    handleType();
  };

  return {
    composerVisible,
    setComposerVisible,
    galleryVisible,
    setGalleryVisible,
    emojiVisible,
    setEmojiVisible,
    micVisible,
    setMicVisible,
    messageText,
    setMessageText,
    attachments,
    addAttachments,
    removeAttachment,
    clearAttachments,
    onTextChange,
    handleEmojiSelect,
    handleBackspace,
  };
}
