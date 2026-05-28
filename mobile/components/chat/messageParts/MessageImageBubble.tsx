import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image as RNImage, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { getCachedPath, peekCachedPath } from '../../../utils/imageCache';
import prefetchQueue from '../../../utils/prefetchQueue';
import { getImageMetadata } from '@/utils/imageMetadataCache';
import FullscreenImageViewer from '../../modals/FullscreenImageViewer';
import { resolveMediaUri } from './messageHelpers';
import { error } from '@/utils/logger';

const IMAGE_SOURCE_CACHE = new Map<string, string>();
const LOADED_IMAGE_URIS = new Set<string>();
const IMAGE_SIZE_CACHE = new Map<string, { width: number; height: number }>();

type MessageImageBubbleProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
  progress?: number;
  onLongPress?: () => void;
  deferHeavyWork?: boolean;
};

function MessageImageBubble({ message, screenWidth, colors, allMedia, progress, onLongPress, deferHeavyWork }: MessageImageBubbleProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const warmedMetadata = message?.id != null ? getImageMetadata(message.id) : null;
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(() => {
    if (message.fileInfo?.width && message.fileInfo?.height) {
      return { width: message.fileInfo.width, height: message.fileInfo.height };
    }
    if (warmedMetadata?.width && warmedMetadata?.height) {
      return { width: warmedMetadata.width, height: warmedMetadata.height };
    }
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
  const DEFAULT_ASPECT = 4 / 3;
  const aspectRatio = cachedSize && cachedSize.width > 0 && cachedSize.height > 0 ? cachedSize.width / cachedSize.height : DEFAULT_ASPECT;
  let imageWidth = maxWidth;
  let imageHeight = maxWidth / aspectRatio;

  if (imageHeight > maxHeight) {
    imageHeight = maxHeight;
    imageWidth = imageHeight * aspectRatio;
  }

  const shimmer = useRef(new Animated.Value(0)).current;
  const DEBUG_CHAT_SCROLL = __DEV__ && !!(globalThis as any).__CHAT_DEBUG_CHAT_SCROLL;

  const cachedLocalFull = fullImageUri ? (IMAGE_SOURCE_CACHE.get(fullImageUri) || peekCachedPath(fullImageUri) || null) : null;
  const cachedLocalThumb = thumbnailUri ? peekCachedPath(thumbnailUri) : null;
  const [localThumb, setLocalThumb] = useState<string | null>(cachedLocalThumb);
  const [localFull, setLocalFull] = useState<string | null>(cachedLocalFull);
  const [loaded, setLoaded] = useState(() => Boolean(fullImageUri && LOADED_IMAGE_URIS.has(fullImageUri)) || Boolean(cachedLocalFull || cachedLocalThumb));

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[chat-image] cache init', {
      messageId: message?.id,
      fullImageUri,
      cachedLocalFull: !!cachedLocalFull,
      cachedLocalThumb: !!cachedLocalThumb,
      loaded,
      ts: Math.round(globalThis?.performance?.now?.() ?? Date.now()),
    });
  }, [cachedLocalFull, cachedLocalThumb, fullImageUri, loaded, message?.id]);

  const thumbnailSource = useMemo(() => {
    const uri = localThumb || thumbnailUri || warmedMetadata?.thumbnailUrl;
    return uri ? { uri } : null;
  }, [localThumb, thumbnailUri, warmedMetadata?.thumbnailUrl]);

  const fullSource = useMemo(() => {
    const uri = localFull || fullImageUri;
    return uri ? { uri } : null;
  }, [localFull, fullImageUri]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[chat-image] mount', {
      messageId: message?.id,
      hasThumb: !!thumbnailUri,
      hasFull: !!fullImageUri,
      localThumb: !!localThumb,
      localFull: !!localFull,
      loaded,
    });
  }, [fullImageUri, localFull, localThumb, loaded, message?.id, thumbnailUri]);

  useEffect(() => {
    if (!__DEV__) return;
    const now = globalThis?.performance?.now?.() ?? Date.now();
    console.log('[chat-image] state snapshot', {
      messageId: message?.id,
      ts: now,
      localThumb: !!localThumb,
      localFull: !!localFull,
      loaded,
      imageSize: imageSize || null,
    });
  }, [localThumb, localFull, loaded, imageSize, message?.id]);

  useEffect(() => {
    if (!DEBUG_CHAT_SCROLL) return;
    console.log('[chat-image-debug] work mode', {
      messageId: message?.id,
      deferHeavyWork: !!deferHeavyWork,
      hasThumbUri: !!thumbnailUri,
      hasFullUri: !!fullImageUri,
      localThumb: !!localThumb,
      localFull: !!localFull,
      loaded: !!loaded,
    });
  }, [DEBUG_CHAT_SCROLL, deferHeavyWork, fullImageUri, localFull, localThumb, loaded, message?.id, thumbnailUri]);

  useEffect(() => {
    if (!fullImageUri) return;
    const cached = IMAGE_SOURCE_CACHE.get(fullImageUri) || peekCachedPath(fullImageUri) || null;
    if (__DEV__) {
      console.log('[chat-image] cache resolve check', {
        messageId: message?.id,
        fullImageUri,
        cached: !!cached,
        localFull: !!localFull,
        loaded,
        ts: Math.round(globalThis?.performance?.now?.() ?? Date.now()),
      });
    }
    if (cached && localFull !== cached) {
      setLocalFull(cached);
    }
    if (cached || LOADED_IMAGE_URIS.has(fullImageUri)) {
      setLoaded(true);
    }
  }, [fullImageUri, localFull, loaded, message?.id]);

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

  useEffect(() => {
    if (deferHeavyWork || loaded) return;
    let didCancel = false;
    const hasSize = Boolean(cachedSize && cachedSize.width && cachedSize.height);
    if (hasSize || !fullImageUri) return;

    const measure = () => {
      try {
        RNImage.getSize(
          fullImageUri,
          (w, h) => {
            if (didCancel) return;
            if (w > 0 && h > 0) {
              const next = { width: w, height: h };
              const prev = IMAGE_SIZE_CACHE.get(fullImageUri);
              const prevRatio = prev ? prev.width / prev.height : null;
              const newRatio = w / h;
              if (!prev || Math.abs((prevRatio || newRatio) - newRatio) > 0.03) {
                IMAGE_SIZE_CACHE.set(fullImageUri, next);
                setImageSize(next);
              }
            }
          },
          () => {
            if (!thumbnailUri) return;
            RNImage.getSize(
              thumbnailUri,
              (tw, th) => {
                if (didCancel) return;
                if (tw > 0 && th > 0) {
                  const next = { width: tw, height: th };
                  IMAGE_SIZE_CACHE.set(fullImageUri, next);
                  setImageSize(next);
                }
              },
              () => {}
            );
          }
        );
      } catch {}
    };

    const idle = (globalThis as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 50));
    const id = idle(() => measure());
    return () => {
      didCancel = true;
      try {
        if ((globalThis as any).cancelIdleCallback) (globalThis as any).cancelIdleCallback(id);
        else clearTimeout(id);
      } catch {}
    };
  }, [fullImageUri, thumbnailUri, cachedSize, deferHeavyWork, loaded]);

  useEffect(() => {
    if (deferHeavyWork || loaded) return;
    let mounted = true;
    try {
      if (!thumbnailUri) return;
      const memoryHit = peekCachedPath(thumbnailUri);
      if (memoryHit) {
        if (__DEV__) {
          console.log('[chat-image] thumb cache hit', { messageId: message?.id, thumbnailUri });
        }
        if (mounted) setLocalThumb(memoryHit);
        return;
      }

      getCachedPath(thumbnailUri)
        .then((cached) => {
          const now = globalThis?.performance?.now?.() ?? Date.now();
          if (mounted && cached) {
            if (__DEV__) {
              console.log('[chat-image] thumb cache resolved', { messageId: message?.id, thumbnailUri, ts: now });
            }
            setLocalThumb(cached);
          } else {
            if (__DEV__) {
              console.log('[chat-image] thumb cache miss, enqueueing', { messageId: message?.id, thumbnailUri, ts: now });
            }
            prefetchQueue.enqueue(thumbnailUri)
              .then((p) => {
                if (mounted && p) {
                  if (__DEV__) {
                    console.log('[chat-image] thumb prefetch resolved', { messageId: message?.id, thumbnailUri, ts: globalThis?.performance?.now?.() ?? Date.now() });
                  }
                  setLocalThumb(p);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          prefetchQueue.enqueue(thumbnailUri)
            .then((p) => {
              if (mounted && p) setLocalThumb(p);
            })
            .catch(() => {});
        });
    } catch {}
    return () => {
      mounted = false;
    };
  }, [thumbnailUri, message?.id, deferHeavyWork, loaded]);

  useEffect(() => {
    if (deferHeavyWork || loaded) return;
    let mounted = true;
    try {
      if (!fullImageUri) return;
      const memoryHit = peekCachedPath(fullImageUri);
      if (memoryHit) {
        if (__DEV__) {
          console.log('[chat-image] full cache hit', { messageId: message?.id, fullImageUri });
        }
        if (mounted) setLocalFull(memoryHit);
        return;
      }

      getCachedPath(fullImageUri)
        .then((cached) => {
          const now = globalThis?.performance?.now?.() ?? Date.now();
          if (mounted && cached) {
            if (__DEV__) {
              console.log('[chat-image] full cache resolved', { messageId: message?.id, fullImageUri, ts: now });
            }
            setLocalFull(cached);
            return;
          }
          if (__DEV__) {
            console.log('[chat-image] full cache miss, enqueueing', { messageId: message?.id, fullImageUri, ts: now });
          }
          prefetchQueue.enqueue(fullImageUri)
            .then((p) => {
              if (mounted && p) {
                if (__DEV__) {
                  console.log('[chat-image] full prefetch resolved', { messageId: message?.id, fullImageUri, ts: globalThis?.performance?.now?.() ?? Date.now() });
                }
                setLocalFull(p);
              }
            })
            .catch(() => {});
        })
        .catch(() => {
          prefetchQueue.enqueue(fullImageUri)
            .then((p) => {
              if (mounted && p) setLocalFull(p);
            })
            .catch(() => {});
        });
    } catch {}
    return () => {
      mounted = false;
    };
  }, [fullImageUri, message?.id, deferHeavyWork, loaded]);

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
          (async () => {
            try {
              const cached = await getCachedPath(fullImageUri);
              if (cached) {
                IMAGE_SOURCE_CACHE.set(fullImageUri, cached);
                LOADED_IMAGE_URIS.add(fullImageUri);
                setLocalFull(cached);
                setLoaded(true);
                return;
              }
              const p = await prefetchQueue.enqueue(fullImageUri);
              if (p) {
                IMAGE_SOURCE_CACHE.set(fullImageUri, p);
                LOADED_IMAGE_URIS.add(fullImageUri);
                setLocalFull(p);
                setLoaded(true);
              }
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
          {localThumb ? (
            <Image
              source={thumbnailSource}
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={150}
            />
          ) : thumbnailUri ? (
            <Image
              source={thumbnailSource}
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
              transition={150}
            />
          ) : null}

          <Image
            source={fullSource}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: colors.surfaceVariant,
              opacity: loaded ? 1 : 0,
            }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={200}
            onLoad={(event) => {
              if (fullImageUri && LOADED_IMAGE_URIS.has(fullImageUri)) {
                return;
              }
              if (__DEV__) {
                console.log('[chat-image] full onLoad', { messageId: message?.id, fullImageUri });
              }
              try {
                const { width, height } = (event as any).source || (event as any).nativeEvent || {};
                if (width > 0 && height > 0) {
                  const nextSize = { width, height };
                  if (fullImageUri) IMAGE_SIZE_CACHE.set(fullImageUri, nextSize);
                  setImageSize(nextSize);
                }
              } catch {}
              if (fullImageUri) {
                IMAGE_SOURCE_CACHE.set(fullImageUri, fullImageUri);
                LOADED_IMAGE_URIS.add(fullImageUri);
                setLocalFull(fullImageUri);
              }
              setLoaded(true);
            }}
            onError={(err) => {
              if (__DEV__) {
                console.log('[chat-image] full onError', { messageId: message?.id, fullImageUri, err: String(err) });
              }
              setLoaded(true);
              error('Image load error:', fullImageUri, err);
            }}
          />
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
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.3)',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 12,
              }}
            >
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

function areMessageImageBubblePropsEqual(prevProps: MessageImageBubbleProps, nextProps: MessageImageBubbleProps) {
  if (prevProps.message === nextProps.message && prevProps.deferHeavyWork === nextProps.deferHeavyWork) return true;
  const prev = prevProps.message;
  const next = nextProps.message;
  if (!prev || !next) return false;
  return (
    prev.id === next.id &&
    prev.type === next.type &&
    prev.status === next.status &&
    prev.fromMe === next.fromMe &&
    prev.isRevoked === next.isRevoked &&
    prev.text === next.text &&
    prev.content === next.content &&
    prev.fileInfo?.url === next.fileInfo?.url &&
    prev.fileInfo?.thumbnailUrl === next.fileInfo?.thumbnailUrl &&
    prev.fileInfo?.thumbnail === next.fileInfo?.thumbnail &&
    prev.fileInfo?.thumb === next.fileInfo?.thumb &&
    prev.fileInfo?.width === next.fileInfo?.width &&
    prev.fileInfo?.height === next.fileInfo?.height &&
    prev.fileInfo?.duration === next.fileInfo?.duration &&
    prevProps.deferHeavyWork === nextProps.deferHeavyWork &&
    prevProps.screenWidth === nextProps.screenWidth &&
    prevProps.colors === nextProps.colors &&
    prevProps.progress === nextProps.progress &&
    prevProps.onLongPress === nextProps.onLongPress
  );
}

const MemoizedMessageImageBubble = React.memo(MessageImageBubble, areMessageImageBubblePropsEqual);

export default MemoizedMessageImageBubble;
