import React from 'react';
import { Image } from 'expo-image';
import MessageTextBubble from './MessageTextBubble';
import MessageFileBubble from './MessageFileBubble';
import MessageImageBubble from './MessageImageBubble';
import MessageVideoBubble from './MessageVideoBubble';
import MessageImageGroupBubble from './MessageImageGroupBubble';
import AudioMessageBubble from './AudioMessageBubble';
import MessageCallBubble from './MessageCallBubble';
import { resolveMediaUri } from './messageHelpers';

type MessageContentProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
  progress?: number;
  textColor: string;
  highlightQuery?: string;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onCallAction?: (message: any, callData: any) => void;
  isGroupThread?: boolean;
};

export default function MessageContent({
  message,
  screenWidth,
  colors,
  allMedia,
  progress,
  textColor,
  highlightQuery,
  onVoiceCall,
  onVideoCall,
  onCallAction,
  isGroupThread,
}: MessageContentProps) {
  if (message.type === 'video') {
    return (
      <MessageVideoBubble
        message={message}
        screenWidth={screenWidth}
        colors={colors}
        allMedia={allMedia}
        progress={progress}
      />
    );
  }

  if (message.type === 'sticker') {
    return <Image source={{ uri: 'https://via.placeholder.com/120x120.png?text=STK' }} style={{ width: 120, height: 120, borderRadius: 12 }} />;
  }

  if (message.type === 'image' && message.fileInfo) {
    return (
      <MessageImageBubble
        message={message}
        screenWidth={screenWidth}
        colors={colors}
        allMedia={allMedia}
        progress={progress}
      />
    );
  }

  if (message.type === 'image_group' && message.images) {
    return (
      <MessageImageGroupBubble
        message={message}
        screenWidth={screenWidth}
        colors={colors}
        allMedia={allMedia}
      />
    );
  }

  if (message.type === 'audio' && message.fileInfo) {
    return (
      <AudioMessageBubble
        url={resolveMediaUri(message.fileInfo.url)}
        duration={message.fileInfo.duration}
        seedKey={message.id}
        amplitudes={message.fileInfo.waveform}
        textColor={textColor}
        isSending={message.status === 'sending'}
      />
    );
  }

  if (message.type === 'file' && message.fileInfo) {
    return <MessageFileBubble message={message} textColor={textColor} colors={colors} />;
  }

  if (message.type === 'call') {
    return (
      <MessageCallBubble
        message={message}
        onVoiceCall={onVoiceCall}
        onVideoCall={onVideoCall}
        onCallAction={onCallAction}
        isGroupThread={isGroupThread}
        colors={colors}
      />
    );
  }

  return <MessageTextBubble message={message} highlightQuery={highlightQuery} textColor={textColor} />;
}
