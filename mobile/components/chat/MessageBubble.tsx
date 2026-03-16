import React, { useState, useMemo } from 'react';
import { useChatThread } from '@/hooks/useChatThread';
import { View, Text, TouchableOpacity, Linking, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
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
  type?: 'text' | 'sticker' | 'contact' | 'separator' | 'system' | 'image' | 'file' | 'image_group';
  contactName?: string;
  contactAvatar?: string;
  contactAvatarColor?: string;
  reactions?: { emoji: string; count?: number }[];
  seenBy?: { id: number; fullName?: string; avatar?: string }[];
  isLastInGroup?: boolean;
  status?: 'sending' | 'sent' | 'error';
  fileInfo?: { url: string; name?: string; size?: number; mime?: string };
  images?: any[]; // for image_group
};

const IMAGE_SIZE_CACHE = new Map<string, {width: number, height: number}>();

export default function MessageBubble({ message, onPress, highlightQuery, onAvatarPress, isLastInGroup, isThreadLast }: { message: ChatMessage, onPress?: () => void, highlightQuery?: string, onAvatarPress?: () => void, isLastInGroup?: boolean, isThreadLast?: boolean }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { allMedia } = useChatThread();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // derive list of image URIs (and their message ids) from entire thread
  // we also keep the corresponding message ids so we can find the correct
  // index when an image URI appears multiple times in the thread.
  const { threadImageUris, threadImageIds } = useMemo(() => {
    const uris: string[] = [];
    const ids: string[] = [];
    // Only use allMedia to build the full array of images for the viewer
    const sourceImages = allMedia && allMedia.length > 0 ? allMedia : [];
    sourceImages.forEach(m => {
      if (m.type === 'image' && m.fileInfo?.url) {
        let uri = m.fileInfo?.url || '';
        if (uri && !uri.startsWith('http')) {
          if (!uri.startsWith('/media')) uri = `/media${uri}`;
          uri = getAvatarUrl(uri) || uri;
        }
        uris.push(uri);
        ids.push(m.id != null ? m.id.toString() : '');
      }
    });

    // We must reverse them because allMedia comes back orderBy id: 'desc' 
    // Wait... if allMedia comes desc, they are newest first. 
    // Messages in bubble are also displayed inverted?
    // Let's check how they were originally ordered. 
    return { 
      threadImageUris: uris, 
      threadImageIds: ids 
    };
  }, [allMedia]);

  // Unify URI building for cache and source for this message
  const fullImageUri = useMemo(() => {
    if (message.type !== 'image' || !message.fileInfo) return null;
    let url = message.fileInfo.url;
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (!url.startsWith('/media')) url = `/media${url}`;
    return getAvatarUrl(url) || url;
  }, [message.type, message.fileInfo]);

  const [imgSize, setImgSize] = useState<{width:number;height:number} | null>(() => {
    if (fullImageUri && IMAGE_SIZE_CACHE.has(fullImageUri)) {
      return IMAGE_SIZE_CACHE.get(fullImageUri)!;
    }
    return null;
  });

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
  } else if (message.type === 'image' && message.fileInfo && fullImageUri) {
    const maxWidth = screenWidth * 0.75;
    contentElement = (
      <>
        <TouchableOpacity
          onPress={() => {
            let idx = -1;
            if (message.id != null) {
              idx = threadImageIds.indexOf(message.id.toString());
            }
            if (idx === -1) {
              idx = threadImageUris.indexOf(fullImageUri);
            }
            let imagesForViewer = threadImageUris;
            if (idx === -1) {
              imagesForViewer = [...threadImageUris, fullImageUri];
              idx = imagesForViewer.length - 1;
            }

            setSelectedIndex(idx);
            setViewerVisible(true);
          }}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: fullImageUri }}
            style={{
              width: maxWidth,
              height: imgSize ? (imgSize.height * (maxWidth / imgSize.width)) : maxWidth * 0.75,
              borderRadius: 12,
              backgroundColor: colors.surfaceVariant
            }}
            contentFit="cover"
            onLoad={(e) => {
              const { width, height } = e.source;
              IMAGE_SIZE_CACHE.set(fullImageUri, { width, height });
              setImgSize({ width, height });
            }}
            onError={(err) => console.log('Image load error:', fullImageUri, err)}
          />
        </TouchableOpacity>
        <FullscreenImageViewer
          visible={viewerVisible}
          images={
            fullImageUri && selectedIndex >= threadImageUris.length
              ? [...threadImageUris, fullImageUri]
              : threadImageUris
          }
          initialIndex={selectedIndex}
          userInfo={{
            name: message.fromMe ? 'Bạn' : message.contactName || 'Người dùng',
            avatarUrl: message.fromMe ? undefined : message.contactAvatar,
          }}
          onClose={() => setViewerVisible(false)}
        />
      </>
    );
  } else if (message.type === 'image_group' && message.images) {
    const maxWidth = screenWidth * 0.75;
    const spacing = 4;
    const total = message.images.length;
    
    const numCols = 2; // Use a fixed column count for consistency and cleaner grid

    const remainder = total % numCols;
    const firstRowCols = remainder === 0 ? numCols : remainder;

    contentElement = (
      <View style={{ width: maxWidth, flexDirection: 'row', flexWrap: 'wrap' }}>
        {message.images.map((img, idx) => {
          let uri = img.fileInfo?.url || '';
          if (uri && !uri.startsWith('http')) {
            if (!uri.startsWith('/media')) uri = `/media${uri}`;
            uri = getAvatarUrl(uri) || uri;
          }
          
          let currentColCount = numCols;
          if (idx < firstRowCols) {
            currentColCount = firstRowCols;
          }

          const imgWidth = (maxWidth - ((currentColCount - 1) * spacing)) / currentColCount;
          const imgHeight = currentColCount === 1 
            ? maxWidth * 0.6 
            : (() => {
                const cachedSize = IMAGE_SIZE_CACHE.get(uri);
                const isLand = cachedSize ? cachedSize.width > cachedSize.height : true; // Default to landscape-like for grid
                return isLand ? imgWidth * 0.75 : imgWidth * 1.3;
              })();

          
          const isRowEnd = (idx < firstRowCols) ? (idx === firstRowCols - 1) : ((idx - firstRowCols + 1) % numCols === 0);

          return (
            <TouchableOpacity
              key={img.id}
              style={{ 
                width: imgWidth, 
                height: imgHeight, 
                marginBottom: spacing,
                marginRight: isRowEnd ? 0 : spacing,
                borderRadius: 10,
                overflow: 'hidden'
              }}
              onPress={() => {
                let viewerIdx = threadImageIds.indexOf(img.id.toString());
                if (viewerIdx === -1) viewerIdx = threadImageUris.indexOf(uri);
                setSelectedIndex(viewerIdx);
                setViewerVisible(true);
              }}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                onLoad={(e) => {
                  const { width, height } = e.source;
                  IMAGE_SIZE_CACHE.set(uri, { width, height });
                  setImgSize({ width, height });
                }}
              />
            </TouchableOpacity>
          );
        })}
        <FullscreenImageViewer
          visible={viewerVisible}
          images={threadImageUris}
          initialIndex={selectedIndex}
          userInfo={{
            name: message.fromMe ? 'Bạn' : message.contactName || 'Người dùng',
            avatarUrl: message.fromMe ? undefined : message.contactAvatar,
          }}
          onClose={() => setViewerVisible(false)}
        />
      </View>
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
            backgroundColor: (message.type === 'image' || message.type === 'image_group') ? 'transparent' : bubbleBg,
            borderWidth: (message.type === 'image' || message.type === 'image_group') ? 0 : 1,
            borderColor,
            padding: (message.type === 'image' || message.type === 'image_group') ? 0 : 12,
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
                      onError={(e) => console.log('Avatar load error:', e)}
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
