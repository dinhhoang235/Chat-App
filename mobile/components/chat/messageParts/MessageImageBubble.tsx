import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import FullscreenImageViewer from '../../modals/FullscreenImageViewer';
import { resolveMediaUri } from './messageHelpers';

type MessageImageBubbleProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
  progress?: number;
};

export default function MessageImageBubble({ message, screenWidth, colors, allMedia, progress }: MessageImageBubbleProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(() => {
    // First, check if dimensions are stored in fileInfo
    if (message.fileInfo?.width && message.fileInfo?.height) {
      return { width: message.fileInfo.width, height: message.fileInfo.height };
    }
    // Otherwise check the cache
    const uri = message.fileInfo?.url ? resolveMediaUri(message.fileInfo.url) : null;
    return uri ? IMAGE_SIZE_CACHE.get(uri) || null : null;
  });
  const { height: screenHeight } = useWindowDimensions();

  const fullImageUri = useMemo(() => {
    if (message.type !== 'image' || !message.fileInfo) return null;
    const url = message.fileInfo.url;
    if (!url) return null;
    return resolveMediaUri(url);
  }, [message.fileInfo, message.type]);



  const { threadImageUris, threadImageIds } = useMemo(() => {
    const uris: string[] = [];
    const ids: string[] = [];
    const sourceImages = allMedia && allMedia.length > 0 ? allMedia : [];
    sourceImages.forEach((m) => {
      if ((m.type === 'image' || m.type === 'video') && m.fileInfo?.url) {
        const uri = resolveMediaUri(m.fileInfo.url);
        uris.push(uri);
        ids.push(m.id != null ? m.id.toString() : '');
      }
    });
    return { threadImageUris: uris, threadImageIds: ids };
  }, [allMedia]);

  if (!message.fileInfo || !fullImageUri) {
    return null;
  }

  const maxWidth = screenWidth * 0.75;
  const maxHeight = screenHeight * 0.48;
  const cachedSize = imageSize || (fullImageUri ? IMAGE_SIZE_CACHE.get(fullImageUri) || null : null);
  // Use 1:1 (square) as default - safer for both landscape and portrait images
  const aspectRatio = cachedSize && cachedSize.width > 0 && cachedSize.height > 0
    ? cachedSize.width / cachedSize.height
    : 1;
  const imageHeight = Math.min(maxWidth / aspectRatio, maxHeight);

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          if (message.status === 'sending') return;
          let idx = -1;
          if (message.id != null) {
            idx = threadImageIds.indexOf(message.id.toString());
          }
          if (idx === -1) {
            idx = threadImageUris.indexOf(fullImageUri);
          }
          const imagesForViewer = idx === -1 ? [...threadImageUris, fullImageUri] : threadImageUris;
          setSelectedIndex(idx === -1 ? imagesForViewer.length - 1 : idx);
          setViewerVisible(true);
        }}
        activeOpacity={0.9}
      >
        <View style={{ width: maxWidth, height: imageHeight, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceVariant }}>
          <Image
            source={{ uri: fullImageUri }}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: colors.surfaceVariant,
            }}
            contentFit="contain"
            onLoad={(event) => {
              const { width, height } = event.source;
              if (width > 0 && height > 0) {
                const nextSize = { width, height };
                IMAGE_SIZE_CACHE.set(fullImageUri, nextSize);
                setImageSize(nextSize);
              }
            }}
            onError={(err) => console.log('Image load error:', fullImageUri, err)}
          />
          {message.status === 'sending' && (
            <View style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 12,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{Math.round((progress || 0) * 100)}%</Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <FullscreenImageViewer
        visible={viewerVisible}
        images={fullImageUri && selectedIndex >= threadImageUris.length ? [...threadImageUris, fullImageUri] : threadImageUris}
        initialIndex={selectedIndex}
        userInfo={{
          name: message.fromMe ? 'Bạn' : message.contactName || 'Người dùng',
          avatarUrl: message.fromMe ? undefined : message.contactAvatar,
        }}
        onClose={() => setViewerVisible(false)}
      />
    </>
  );
}

const IMAGE_SIZE_CACHE = new Map<string, { width: number; height: number }>();
