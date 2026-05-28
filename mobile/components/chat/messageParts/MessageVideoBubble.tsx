import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as VideoThumbnails from 'expo-video-thumbnails';
import FullscreenImageViewer from '../../modals/FullscreenImageViewer';
import InlineVideoPlayer from './InlineVideoPlayer';
import { CircularProgress } from '../CircularProgress';
import { resolveMediaUri } from './messageHelpers';
import { getCachedPath, peekCachedPath } from '../../../utils/imageCache';
import prefetchQueue from '../../../utils/prefetchQueue';
import { warn } from '@/utils/logger';


type MessageVideoBubbleProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
  progress?: number;
  onLongPress?: () => void;
};

export default function MessageVideoBubble({ message, screenWidth, colors, allMedia, progress, onLongPress }: MessageVideoBubbleProps) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [localThumb, setLocalThumb] = useState<string | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(() => {
    if (!message.fileInfo?.url) return null;
    return peekCachedPath(resolveMediaUri(message.fileInfo.url));
  });

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

  const videoUrl = useMemo(() => {
    if (!message.fileInfo?.url) return null;
    return resolveMediaUri(message.fileInfo.url);
  }, [message.fileInfo]);

  const displayThumb = useMemo(() => {
    if (message.fileInfo?.thumbnailUrl) {
      return resolveMediaUri(message.fileInfo.thumbnailUrl);
    }
    return localThumb;
  }, [message.fileInfo, localThumb]);

  useEffect(() => {
    let mounted = true;
    try {
      if (!videoUrl) return;

      const memoryHit = peekCachedPath(videoUrl);
      if (memoryHit) {
        if (mounted) setLocalVideoUrl(memoryHit);
      } else {
        getCachedPath(videoUrl)
          .then((cached) => {
            if (mounted && cached) setLocalVideoUrl(cached);
            else {
              prefetchQueue.enqueue(videoUrl).then((p) => {
                if (mounted && p) setLocalVideoUrl(p);
              }).catch(() => {});
            }
          })
          .catch(() => {
            prefetchQueue.enqueue(videoUrl).then((p) => {
              if (mounted && p) setLocalVideoUrl(p);
            }).catch(() => {});
          });
      }
    } catch {}

    return () => {
      mounted = false;
    };
  }, [videoUrl]);

  useEffect(() => {
    if (message.status === 'sending' && message.fileInfo?.url) {
      (async () => {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(message.fileInfo.url, { time: 0 });
          setLocalThumb(uri);
        } catch (e) {
          warn('Local video thumb failed', e);
        }
      })();
    }
  }, [message.status, message.fileInfo]);

  if (!videoUrl) return null;

  const maxWidth = screenWidth * 0.75;
  const height = maxWidth;

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
            idx = threadImageUris.indexOf(videoUrl);
          }
          const imagesForViewer = idx === -1 ? [...threadImageUris, videoUrl] : threadImageUris;
          setSelectedIndex(idx === -1 ? imagesForViewer.length - 1 : idx);
          setViewerVisible(true);
        }}
        onLongPress={() => {
          if (message.isRevoked || message.status === 'sending') return;
          onLongPress?.();
        }}
        delayLongPress={200}
        android_disableSound={true}
        activeOpacity={0.9}
      >
        <View style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', width: maxWidth, height }} pointerEvents="none">
          {message.status === 'sending' ? (
            <Image source={{ uri: displayThumb || videoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <InlineVideoPlayer url={localVideoUrl || videoUrl} />
          )}

          {message.status === 'sending' && (
            <View style={styles.overlay}>
              <CircularProgress
                size={60}
                strokeWidth={4}
                progress={progress || 0}
                color="#0084FF"
                backgroundColor="rgba(255,255,255,0.2)"
              />
              {message.fileInfo?.size && (
                <Text style={styles.uploadText}>
                  {(((progress || 0) * message.fileInfo.size) / (1024 * 1024)).toFixed(1)}MB / {(message.fileInfo.size / (1024 * 1024)).toFixed(1)}MB
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
      <FullscreenImageViewer
        visible={viewerVisible}
        images={videoUrl && selectedIndex >= threadImageUris.length ? [...threadImageUris, videoUrl] : threadImageUris}
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

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
