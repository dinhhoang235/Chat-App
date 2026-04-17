import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AudioMessageBubble from './AudioMessageBubble';
import { resolveMediaUri } from './messageHelpers';

type MessageFileBubbleProps = {
  message: any;
  textColor: string;
  colors: any;
};

export default function MessageFileBubble({ message, textColor, colors }: MessageFileBubbleProps) {
  if (!message.fileInfo) return null;

  const { url, name, size, mime } = message.fileInfo;
  if (mime?.startsWith('audio/')) {
    return (
      <AudioMessageBubble
        url={resolveMediaUri(url)}
        duration={message.fileInfo.duration}
        seedKey={message.id}
        amplitudes={message.fileInfo.waveform}
        textColor={textColor}
        isSending={message.status === 'sending'}
      />
    );
  }

  const uri = resolveMediaUri(url);
  const filename = name || 'File';
  const ext = mime ? mime.split('/')[1] : filename.split('.').pop();
  const readableSize = size != null ? `${(size / 1024 / 1024).toFixed(1)} MB` : '';

  return (
    <TouchableOpacity onPress={() => Linking.openURL(uri)} activeOpacity={0.8}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialIcons name="download" size={24} color={textColor} />
        <View style={{ marginLeft: 8, maxWidth: 200 }}>
          <Text style={{ color: textColor, fontWeight: '500' }} numberOfLines={1}>{filename}</Text>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>
            {ext ? ext.toUpperCase() : ''}{readableSize ? ` · ${readableSize}` : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
