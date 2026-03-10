import React from 'react';
import { View, Text, TouchableOpacity, Image, Linking, useWindowDimensions } from 'react-native';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { getAvatarUrl } from '@/utils/avatar';
import { FullscreenImageViewer } from '@/components/modals';

type ChatMessage = {
  id: string;
  text?: string;
  content?: string;
  time?: string;
  fromMe?: boolean;
  type?: 'text' | 'sticker' | 'contact' | 'separator' | 'system' | 'image' | 'file';
  contactName?: string;
  contactAvatar?: string;
  contactAvatarColor?: string;
  reactions?: { emoji: string; count?: number }[];
  seenBy?: { id: number; fullName?: string; avatar?: string }[];
  isLastInGroup?: boolean;
  status?: 'sending' | 'sent' | 'error';
  fileInfo?: { url: string; name?: string; size?: number; mime?: string };
};

export default function MessageBubble({ message, onPress, highlightQuery, onAvatarPress, isLastInGroup, isThreadLast }: { message: ChatMessage, onPress?: () => void, highlightQuery?: string, onAvatarPress?: () => void, isLastInGroup?: boolean, isThreadLast?: boolean }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [imgSize, setImgSize] = React.useState<{width:number;height:number} | null>(null);
  const [viewerVisible, setViewerVisible] = React.useState(false);

  if (message.type === 'separator' || message.type === 'system') {
    const textToShow = message.text || message.content;
    return (
      <View className="w-full items-center my-2">
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceVariant }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500' }}>{textToShow}</Text>
        </View>
      </View>
    );
  }


  const isOutgoing = !!message.fromMe;
  let bubbleBg = colors.bubbleOther;
  let borderColor = colors.surfaceVariant;
  let textColor = colors.bubbleOtherText;
  const timeColor = colors.textSecondary;

  if (isOutgoing) {
    bubbleBg = colors.bubbleMe;
    borderColor = colors.bubbleMe;
    textColor = colors.bubbleMeText;
  }

  // helper to render highlighted parts
  const renderHighlighted = (text?: string) => {
    const displayText = text || message.content;
    if (!displayText) return null;
    if (!highlightQuery) return <Text style={{ color: textColor }}>{displayText}</Text>;
    const q = highlightQuery.trim().toLowerCase();
    if (!q) return <Text style={{ color: textColor }}>{displayText}</Text>;

    const parts: { text: string; highlight: boolean }[] = [];
    let remaining = displayText;
    while (remaining.length > 0) {
      const idx = remaining.toLowerCase().indexOf(q);
      if (idx === -1) {
        parts.push({ text: remaining, highlight: false });
        break;
      }
      if (idx > 0) parts.push({ text: remaining.slice(0, idx), highlight: false });
      parts.push({ text: remaining.slice(idx, idx + q.length), highlight: true });
      remaining = remaining.slice(idx + q.length);
    }

    return (
      <Text>
        {parts.map((p, i) => (
          <Text key={i} style={p.highlight ? { backgroundColor: '#FFD54F', color: '#000', fontWeight: '700' } : { color: textColor }}>{p.text}</Text>
        ))}
      </Text>
    );
  };

  // after computing styles/render helper we decide what content to show
  let contentElement: React.ReactNode = null;

  if (message.type === 'sticker') {
    contentElement = (
      <Image source={{ uri: 'https://via.placeholder.com/120x120.png?text=STK' }} style={{ width: 120, height: 120, borderRadius: 12 }} />
    );
  } else if (message.type === 'image' && message.fileInfo) {
    let uri = message.fileInfo.url;
    if (!uri.startsWith('http')) {
      // ensure /media prefix
      if (!uri.startsWith('/media')) uri = `/media${uri}`;
      uri = getAvatarUrl(uri) || uri;
    }
    const maxWidth = screenWidth * 0.7; // 70% of screen
    const onLoad = (e: any) => {
      const { width, height } = e.nativeEvent.source;
      let w = width;
      let h = height;
      if (w > maxWidth) {
        const ratio = maxWidth / w;
        w = maxWidth;
        h = h * ratio;
      }
      setImgSize({ width: w, height: h });
    };
    contentElement = (
      <>
        <TouchableOpacity onPress={() => setViewerVisible(true)} activeOpacity={0.9}>
          <Image
            source={{ uri }}
            style={{
              width: imgSize ? imgSize.width : maxWidth,
              height: imgSize ? imgSize.height : maxWidth,
              borderRadius: 12,
              resizeMode: 'contain'
            }}
            onLoad={onLoad}
          />
        </TouchableOpacity>
        <FullscreenImageViewer visible={viewerVisible} images={[uri]} initialIndex={0} onClose={() => setViewerVisible(false)} />
      </>
    );
  } else if (message.type === 'file' && message.fileInfo) {
    let { url, name, size, mime } = message.fileInfo;
    let uri = url;
    if (!uri.startsWith('http')) {
      if (!uri.startsWith('/media')) uri = `/media${uri}`;
      uri = getAvatarUrl(uri) || uri;
    }

    const filename = name || 'File';
    const ext = mime ? mime.split('/')[1] : filename.split('.').pop();
    const readableSize = size != null ? `${(size / 1024 / 1024).toFixed(1)} MB` : '';


    contentElement = (
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
  } else {
    // default text rendering
    contentElement = renderHighlighted(message.text);
  }

  // Contact card style
  if (message.type === 'contact') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}> 
          <View style={{ width: 288, backgroundColor: colors.tint, borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tint, marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{(message.contactName || '').slice(0,2)}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{message.contactName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.tint }}>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ color: '#fff' }}>Kết bạn</Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: colors.tint }} />
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* reaction bubble */}
          <View style={{ marginLeft: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: colors.text }}>♡</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}> 
        {!message.fromMe && (
          <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={{ opacity: isLastInGroup ? 1 : 0 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVariant, overflow: 'hidden' }}>
              {message.contactAvatar ? (
                <Image 
                  source={{ uri: message.contactAvatar }} 
                  style={{ width: 40, height: 40 }} 
                />
              ) : (
                <Text style={{ color: colors.text, fontWeight: '700' }}>{message.contactName ? message.contactName.slice(0,1) : 'A'}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        <View style={{ maxWidth: '72%', marginLeft: isOutgoing ? 'auto' : 12 }} className={`${isOutgoing ? 'items-end' : 'items-start'}`}> 
            {/* for image attachments we don’t show the standard bubble styling */}
        <View style={{
            backgroundColor: message.type === 'image' ? 'transparent' : bubbleBg,
            borderWidth: message.type === 'image' ? 0 : 1,
            borderColor,
            padding: message.type === 'image' ? 0 : 12,
            borderRadius: 18,
            marginBottom: isLastInGroup ? 0 : -8
          }}>
            {contentElement}
          </View>

          {isLastInGroup && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
              <Text style={{ color: timeColor, fontSize: 12, marginRight: isOutgoing ? 0 : 8, marginLeft: isOutgoing ? 8 : 0 }}>
                {isOutgoing && isThreadLast ? (
                   message.status === 'sending' ? 'Đang gửi' : 
                   (message.seenBy && message.seenBy.length > 0) ? '' : 'Đã gửi'
                ) : message.time}
              </Text>
              {message.reactions && message.reactions.length > 0 && (
                <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.text }}>{message.reactions[0].emoji} {message.reactions[0].count ?? ''}</Text>
                </View>
              )}
            </View>
          )}

          {/* Seen By Avatars - Only show for last message in entire thread */}
          {isOutgoing && isThreadLast && message.seenBy && message.seenBy.length > 0 && (
            <View style={{ flexDirection: 'row', marginTop: -12, justifyContent: 'flex-end', paddingBottom: 4 }}>
              {message.seenBy.map((u, idx) => (
                <View 
                  key={u.id} 
                  style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: 12, 
                    backgroundColor: colors.surfaceVariant, 
                    marginLeft: idx > 0 ? -8 : 0,
                    borderWidth: 1.5,
                    borderColor: colors.background,
                    overflow: 'hidden'
                  }}
                >
                  {u.avatar ? (
                    <Image 
                      source={{ uri: getAvatarUrl(u.avatar) || undefined }} 
                      style={{ width: 24, height: 24 }} 
                      onError={(e) => console.log('Avatar load error:', e.nativeEvent.error)}
                    />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {u.fullName ? u.fullName.slice(0,1) : '?'}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
