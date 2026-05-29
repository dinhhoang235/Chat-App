import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Animated, Image as RNImage, Dimensions } from 'react-native';
import { getCachedPath, peekCachedPath } from '../../../utils/imageCache';
import { Image } from 'expo-image';
import FullscreenImageViewer from '../../modals/FullscreenImageViewer';
import { getAvatarUrl } from '@/utils/avatar';
import { resolveMediaUri } from './messageHelpers';
import prefetchQueue from '../../../utils/prefetchQueue';
import { setMessageSize } from '@/utils/messageSizeCache';

const LOADED_IMAGE_URIS = new Set<string>();

type MessageImageGroupBubbleProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
  onLongPress?: () => void;
  deferHeavyWork?: boolean;
};

export default function MessageImageGroupBubble({ message, screenWidth, colors, allMedia, onLongPress, deferHeavyWork }: MessageImageGroupBubbleProps) {
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

  const DEBUG_IMAGE_LOG = __DEV__ && !!(globalThis as any).__CHAT_DEBUG_IMAGE;

  const allImagesLoaded = message.images.length > 0 && message.images.every((img: any) => {
    let uri = img.fileInfo?.url || '';
    if (uri && !uri.startsWith('http')) uri = getAvatarUrl(uri) || uri;
    return !!uri && !!loadedMap[uri];
  });

  useEffect(() => {
    if (deferHeavyWork) return;
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();
    return () => shimmer.stopAnimation();
  }, [shimmer, deferHeavyWork]);

  // Pre-warm disk cache for group images (one effect at component level)
  useEffect(() => {
    if (deferHeavyWork || allImagesLoaded) return;
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
            // log removed
            initial[uri] = memoryHit;
            continue;
          }

          // Probe disk cache non-blocking; if found quickly set it, otherwise
          // enqueue background prefetch so we don't block the UI thread here.
          getCachedPath(uri)
            .then((cached) => {
              if (mounted && cached) {
                // log removed
                setLocalUriMap((s) => ({ ...s, [uri]: cached }));
                setLoadedMap((s) => ({ ...s, [uri]: true }));
              }
              else {
                // log removed
                prefetchQueue.enqueue(uri).then((p) => {
                  if (mounted && p) {
                    // log removed
                    setLocalUriMap((s) => ({ ...s, [uri]: p }));
                    setLoadedMap((s) => ({ ...s, [uri]: true }));
                  }
                }).catch(() => {});
              }
            })
            .catch(() => {
              prefetchQueue.enqueue(uri).then((p) => {
                  if (mounted && p) {
                    // log removed
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
  }, [message.images, message?.id, DEBUG_IMAGE_LOG, deferHeavyWork, allImagesLoaded]);

  // Measure image dimensions in idle time and cache them. When sizes
  // are available we compute and set the message layout size so
  // FlashList can avoid reflow when images hydrate.
  useEffect(() => {
    if (deferHeavyWork || allImagesLoaded) return;
    if (!message?.images || message.images.length === 0) return;
    let mounted = true;
    const toMeasure: string[] = [];
    for (const img of message.images) {
      try {
        let uri = img.fileInfo?.url || '';
        if (uri && !uri.startsWith('http')) uri = getAvatarUrl(uri) || uri;
        if (!uri) continue;
        if (!IMAGE_SIZE_CACHE.has(uri)) toMeasure.push(uri);
      } catch {}
    }
    if (toMeasure.length === 0) return;

    const rIC = (globalThis as any).requestIdleCallback || ((fn: Function) => setTimeout(fn, 200));
    const id = rIC(() => {
      for (const uri of toMeasure) {
        try {
          RNImage.getSize(uri, (w, h) => {
            if (!mounted) return;
            try {
              const prev = IMAGE_SIZE_CACHE.get(uri);
              const prevRatio = prev ? prev.width / prev.height : 0;
              const newRatio = w / h || 0;
              if (!prev || Math.abs(prevRatio - newRatio) > 0.03) {
                IMAGE_SIZE_CACHE.set(uri, { width: w, height: h });
                // log removed
              }
            } catch {}
          }, () => {});
        } catch {}
      }

      // small debounce to let several measurements finish then compute
      setTimeout(() => {
        if (!mounted) return;
        try {
          const computed = (() => {
            try {
              const count = message.images.length;
              const per = count === 2 ? 2 : Math.min(3, count);
              const gap = spacing;
              const cellW = Math.floor((maxWidth - gap * (per - 1)) / per);
              const maxCellHeightCap = Math.round(Dimensions.get('window').height * 0.48);
              let maxCellH = 0;
              for (let i = 0; i < count; i++) {
                const img = message.images[i];
                let uri = img.fileInfo?.url || '';
                if (uri && !uri.startsWith('http')) uri = getAvatarUrl(uri) || uri;
                const fileInfoSize = img.fileInfo?.width && img.fileInfo?.height ? { width: img.fileInfo.width, height: img.fileInfo.height } : undefined;
                const cached = fileInfoSize || IMAGE_SIZE_CACHE.get(uri);
                const aspect = cached ? (cached.width / cached.height) : (4 / 3);
                let cellH = Math.round(cellW / aspect);
                if (cellH > maxCellHeightCap) cellH = maxCellHeightCap;
                if (cellH > maxCellH) maxCellH = cellH;
              }
              const rows = Math.ceil(count / per);
              const totalH = rows * maxCellH + (rows - 1) * gap;
              return Math.round(totalH + 12 + 10);
            } catch {
              return undefined;
            }
          })();

            if (computed && message.id != null) {
            setMessageSize(message.id, computed);
          }
        } catch {}
      }, 260);
    });

    return () => {
      mounted = false;
      try { if ((globalThis as any).cancelIdleCallback) (globalThis as any).cancelIdleCallback(id); } catch {}
    };
  }, [message.images, maxWidth, spacing, DEBUG_IMAGE_LOG, message?.id, deferHeavyWork, allImagesLoaded]);

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
                if (LOADED_IMAGE_URIS.has(uri)) return;
                // log removed
                LOADED_IMAGE_URIS.add(uri);
                setLoadedMap((s) => ({ ...s, [uri]: true }));
              }}
              onError={() => {
                  // log removed
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
