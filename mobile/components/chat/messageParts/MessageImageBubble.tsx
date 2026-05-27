import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, Animated } from 'react-native';
import { getCachedPath, downloadToCache, peekCachedPath } from '../../../utils/imageCache';
import { Image } from 'expo-image';
import FullscreenImageViewer from '../../modals/FullscreenImageViewer';
import { resolveMediaUri } from './messageHelpers';
import { error } from '@/utils/logger';
import prefetchQueue from '../../../utils/prefetchQueue';

type MessageImageBubbleProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
  progress?: number;
  onLongPress?: () => void;
};

export default function MessageImageBubble({ message, screenWidth, colors, allMedia, progress, onLongPress }: MessageImageBubbleProps) {
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

  const thumbnailUri = useMemo(() => {
    if (!message.fileInfo) return null;
    const t = message.fileInfo.thumbnailUrl || message.fileInfo.thumbnail || message.fileInfo.thumb;
    if (!t) return null;
    return resolveMediaUri(t);
  }, [message.fileInfo]);



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
  const maxHeight = screenHeight * 0.48;
  const cachedSize = imageSize || (fullImageUri ? IMAGE_SIZE_CACHE.get(fullImageUri) || null : null);
  // Use 1:1 (square) as default - safer for both landscape and portrait images
  const aspectRatio = cachedSize && cachedSize.width > 0 && cachedSize.height > 0
    ? cachedSize.width / cachedSize.height
    : 1;
  let imageWidth = maxWidth;
  let imageHeight = maxWidth / aspectRatio;

  if (imageHeight > maxHeight) {
    imageHeight = maxHeight;
    imageWidth = imageHeight * aspectRatio;
  }

  const [loaded, setLoaded] = useState(false);
  const shimmer = useRef(new Animated.Value(0)).current;
  const [localThumb, setLocalThumb] = useState<string | null>(() => (thumbnailUri ? peekCachedPath(thumbnailUri) : null));
  const [localFull, setLocalFull] = useState<string | null>(() => (fullImageUri ? peekCachedPath(fullImageUri) : null));

  useEffect(() => {
    if (loaded) return;
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();
    return () => {
      shimmer.stopAnimation();
    };
  }, [loaded, shimmer]);

  // Try to use cached thumbnail if available, otherwise start background download
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (thumbnailUri) {
          const memoryHit = peekCachedPath(thumbnailUri);
          if (memoryHit) {
            if (mounted) setLocalThumb(memoryHit);
            return;
          }
          const cached = await getCachedPath(thumbnailUri);
          if (mounted && cached) {
            setLocalThumb(cached);
            return;
          }
          // background download thumbnail (don't await)
          downloadToCache(thumbnailUri).then((p) => {
            if (mounted && p) setLocalThumb(p);
          }).catch(() => {});
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [thumbnailUri]);

  // Hydrate the full image from disk cache as early as possible so images
  // that were preloaded in the background can show immediately on mount.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!fullImageUri) return;
        const memoryHit = peekCachedPath(fullImageUri);
        if (memoryHit) {
          if (mounted) setLocalFull(memoryHit);
          return;
        }
        const cached = await getCachedPath(fullImageUri);
        if (mounted && cached) {
          setLocalFull(cached);
          return;
        }

        prefetchQueue.enqueue(fullImageUri).then((p) => {
          if (mounted && p) setLocalFull(p);
        }).catch(() => {});
      } catch {}
    })();
    return () => { mounted = false; };
  }, [fullImageUri]);

  if (!message.fileInfo || !fullImageUri) {
    return null;
  }

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
            // download full resolution in background and use local copy for viewer if ready
            (async () => {
              try {
                const cached = await getCachedPath(fullImageUri);
                if (cached) {
                  setLocalFull(cached);
                  return;
                }
                const p = await downloadToCache(fullImageUri);
                if (p) setLocalFull(p);
              } catch {}
            })();
        }}
        onLongPress={() => {
          if (message.isRevoked || message.status === 'sending') return;
          onLongPress?.();
        }}
        delayLongPress={200}
        android_disableSound={true}
        activeOpacity={0.9}
      >
        <View style={{ width: imageWidth, height: imageHeight, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceVariant }}>
          {/* full-resolution image (hidden until loaded) */}
          <Image
            source={{ uri: localFull || fullImageUri }}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: colors.surfaceVariant,
            }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={200}
            onLoad={(event) => {
              try {
                const { width, height } = (event as any).source || (event as any).nativeEvent || {};
                if (width > 0 && height > 0) {
                  const nextSize = { width, height };
                  if (fullImageUri) IMAGE_SIZE_CACHE.set(fullImageUri, nextSize);
                  setImageSize(nextSize);
                }
              } catch {}
              setLoaded(true);
            }}
            onError={(err) => {
              setLoaded(true);
              error('Image load error:', fullImageUri, err);
            }}
          />
          {/* thumbnail underneath if available, shown until full image loads */}
          {localThumb ? (
            <Image
              source={{ uri: localThumb }}
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={150}
            />
          ) : (thumbnailUri && (
            <Image
              source={{ uri: thumbnailUri }}
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={150}
            />
          ))}
          {!loaded && (
            <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: colors.surfaceVariant }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  left: -imageWidth,
                  top: 0,
                  bottom: 0,
                  width: imageWidth * 0.6,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  transform: [
                    {
                      translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-imageWidth, imageWidth] }),
                    },
                  ],
                }}
              />
            </View>
          )}
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
        images={(() => {
          const base = [...threadImageUris];
          if (fullImageUri && selectedIndex >= base.length) {
            base.push(localFull || fullImageUri);
            return base;
          }
          if (selectedIndex >= 0 && selectedIndex < base.length) {
            base[selectedIndex] = localFull || base[selectedIndex];
          }
          return base;
        })()}
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
