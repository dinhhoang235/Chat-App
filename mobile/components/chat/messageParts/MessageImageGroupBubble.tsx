import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { getCachedPath, peekCachedPath } from '../../../utils/imageCache';
import { Image } from 'expo-image';
import FullscreenImageViewer from '../../modals/FullscreenImageViewer';
import { getAvatarUrl } from '@/utils/avatar';
import { resolveMediaUri } from './messageHelpers';
import prefetchQueue from '../../../utils/prefetchQueue';

type MessageImageGroupBubbleProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
  onLongPress?: () => void;
};

export default function MessageImageGroupBubble({ message, screenWidth, colors, allMedia, onLongPress }: MessageImageGroupBubbleProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

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



  const maxWidth = screenWidth * 0.75;
  const spacing = 4;
  const total = message.images.length;
  const numCols = 2;
  const remainder = total % numCols;
  const firstRowCols = remainder === 0 ? numCols : remainder;
  const [localUriMap, setLocalUriMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const img of message.images || []) {
      let uri = img.fileInfo?.url || '';
      if (uri && !uri.startsWith('http')) uri = getAvatarUrl(uri) || uri;
      if (!uri) continue;
      const cached = peekCachedPath(uri);
      if (cached) initial[uri] = cached;
    }
    return initial;
  });

  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const img of message.images || []) {
      let uri = img.fileInfo?.url || '';
      if (uri && !uri.startsWith('http')) uri = getAvatarUrl(uri) || uri;
      if (!uri) continue;
      if (peekCachedPath(uri) || localUriMap[uri]) {
        initial[uri] = true;
      }
    }
    return initial;
  });
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[chat-image-group] mount', {
      messageId: message?.id,
      imageCount: message?.images?.length ?? 0,
      cachedCount: Object.keys(localUriMap).length,
      loadedCount: Object.keys(loadedMap).filter((key) => loadedMap[key]).length,
    });
  }, [loadedMap, localUriMap, message?.id, message?.images?.length]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();
    return () => shimmer.stopAnimation();
  }, [shimmer]);

  // Pre-warm disk cache for group images (one effect at component level)
  useEffect(() => {
    let mounted = true;
    if (!message?.images || message.images.length === 0) return;

    try {
      const initial: Record<string, string> = {};
      for (const img of message.images) {
        try {
          let uri = img.fileInfo?.url || '';
          if (uri && !uri.startsWith('http')) uri = getAvatarUrl(uri) || uri;
          if (!uri) continue;

          const memoryHit = peekCachedPath(uri);
          if (mounted && memoryHit) {
            if (__DEV__) {
              console.log('[chat-image-group] cache hit', { messageId: message?.id, uri });
            }
            initial[uri] = memoryHit;
            continue;
          }

          // Probe disk cache non-blocking; if found quickly set it, otherwise
          // enqueue background prefetch so we don't block the UI thread here.
          getCachedPath(uri)
            .then((cached) => {
              if (mounted && cached) {
                if (__DEV__) {
                  console.log('[chat-image-group] cache resolved', { messageId: message?.id, uri });
                }
                setLocalUriMap((s) => ({ ...s, [uri]: cached }));
                setLoadedMap((s) => ({ ...s, [uri]: true }));
              }
              else {
                prefetchQueue.enqueue(uri).then((p) => {
                  if (mounted && p) {
                    if (__DEV__) {
                      console.log('[chat-image-group] prefetch resolved', { messageId: message?.id, uri });
                    }
                    setLocalUriMap((s) => ({ ...s, [uri]: p }));
                    setLoadedMap((s) => ({ ...s, [uri]: true }));
                  }
                }).catch(() => {});
              }
            })
            .catch(() => {
              prefetchQueue.enqueue(uri).then((p) => {
                if (mounted && p) {
                  if (__DEV__) {
                    console.log('[chat-image-group] prefetch resolved', { messageId: message?.id, uri });
                  }
                  setLocalUriMap((s) => ({ ...s, [uri]: p }));
                  setLoadedMap((s) => ({ ...s, [uri]: true }));
                }
              }).catch(() => {});
            });
        } catch {}
      }
      if (mounted && Object.keys(initial).length) setLocalUriMap((s) => ({ ...s, ...initial }));
    } catch {}

    return () => { mounted = false; };
  }, [message.images, message?.id]);

  return (
    <View style={{ width: maxWidth, flexDirection: 'row', flexWrap: 'wrap' }}>
      {message.images.map((img: any, idx: number) => {
        let uri = img.fileInfo?.url || '';
        if (uri && !uri.startsWith('http')) {
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
              // Check fileInfo dimensions first, then cache
              const fileInfoSize = img.fileInfo?.width && img.fileInfo?.height 
                ? { width: img.fileInfo.width, height: img.fileInfo.height }
                : IMAGE_SIZE_CACHE.get(uri);
              const cachedSize = fileInfoSize || IMAGE_SIZE_CACHE.get(uri);
              const isLand = cachedSize ? cachedSize.width > cachedSize.height : true;
              return isLand ? imgWidth * 0.75 : imgWidth * 1.3;
            })();

        const isRowEnd = (idx < firstRowCols) ? (idx === firstRowCols - 1) : ((idx - firstRowCols + 1) % numCols === 0);

        const isLoaded = !!loadedMap[uri] || false;

        

        return (
          <TouchableOpacity
            key={img.id}
            style={{
              width: imgWidth,
              height: imgHeight,
              marginBottom: spacing,
              marginRight: isRowEnd ? 0 : spacing,
              borderRadius: 10,
              overflow: 'hidden',
            }}
            onPress={() => {
              let viewerIdx = threadImageIds.indexOf(img.id.toString());
              if (viewerIdx === -1) viewerIdx = threadImageUris.indexOf(uri);
              setSelectedIndex(viewerIdx);
              setViewerVisible(true);
            }}
            onLongPress={() => {
              if (message.isRevoked) return;
              onLongPress?.();
            }}
            delayLongPress={200}
            android_disableSound={true}
            activeOpacity={0.9}
            >
            <Image
              source={{ uri: localUriMap[uri] || uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              onLoad={() => {
                if (__DEV__) {
                  console.log('[chat-image-group] onLoad', { messageId: message?.id, uri });
                }
                setLoadedMap((s) => ({ ...s, [uri]: true }));
              }}
              onError={() => {
                if (__DEV__) {
                  console.log('[chat-image-group] onError', { messageId: message?.id, uri });
                }
                setLoadedMap((s) => ({ ...s, [uri]: true }));
              }}
            />
            {!isLoaded && (
              <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: colors.surfaceVariant }}>
                <Animated.View
                  style={{
                    position: 'absolute',
                    left: -imgWidth,
                    top: 0,
                    bottom: 0,
                    width: imgWidth * 0.6,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    transform: [
                      {
                        translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-imgWidth, imgWidth] }),
                      },
                    ],
                  }}
                />
              </View>
            )}
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
}

const IMAGE_SIZE_CACHE = new Map<string, { width: number; height: number }>();
