import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useChatThread } from '@/hooks/useChatThread';
import { View, Text, TouchableOpacity, Linking, useWindowDimensions, Animated, StyleSheet } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Image } from 'expo-image';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getAvatarUrl } from '@/utils/avatar';
import { getInitials } from '@/utils/initials';
import FullscreenImageViewer from '../modals/FullscreenImageViewer';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CircularProgress } from './CircularProgress';
import AudioWaveform from './AudioWaveform';

const InlineVideoPlayer = ({ url }: { url: string }) => {
  const [videoDuration, setVideoDuration] = useState(0);
  const durationRef = useRef<number>(0);
  const durationCheckedRef = useRef(false);

  const playerSetup = useCallback((p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  }, []);

  const player = useVideoPlayer(url, playerSetup);

  useEffect(() => {
    durationCheckedRef.current = false;
    durationRef.current = 0;
    
    const intv = setInterval(() => {
      if (!durationCheckedRef.current && player?.duration && player.duration > 0) {
        setVideoDuration(player.duration * 1000);
        durationRef.current = player.duration * 1000;
        durationCheckedRef.current = true;
        clearInterval(intv);
      }
    }, 250);
    
    return () => {
      clearInterval(intv);
    };
  }, [player, url]);

  return (
    <>
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        nativeControls={false}
        contentFit="cover"
      />
      {videoDuration > 0 && (
        <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
            {Math.floor(videoDuration / 60000).toString().padStart(2, '0')}:{Math.floor((videoDuration % 60000) / 1000).toString().padStart(2, '0')}
          </Text>
        </View>
      )}
    </>
  );
};

type ChatMessage = {
  id: string;
  text?: string;
  content?: string;
  time?: string;
  fromMe?: boolean;
  type?: 'text' | 'sticker' | 'contact' | 'separator' | 'system' | 'image' | 'video' | 'audio' | 'file' | 'image_group';
  contactName?: string;
  contactAvatar?: string;
  contactAvatarColor?: string;
  reactions?: { emoji: string; count?: number }[];
  seenBy?: { id: number; fullName?: string; avatar?: string }[];
  isLastInGroup?: boolean;
  status?: 'sending' | 'sent' | 'error';
  fileInfo?: { url: string; name?: string; size?: number; mime?: string; thumbnailUrl?: string; duration?: number; waveform?: number[] };
  images?: any[]; // for image_group
  replyTo?: any;
  progress?: number;
};

const IMAGE_SIZE_CACHE = new Map<string, {width: number, height: number}>();

const resolveMediaUri = (url: string) => {
  if (url.startsWith('http') || url.startsWith('file://') || url.startsWith('content://')) {
    return url;
  }
  return getAvatarUrl(url) || url;
};

const formatDuration = (seconds?: number) => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '--:--';
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60).toString().padStart(2, '0');
  const remaining = (rounded % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

const hashWaveSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededAmplitudes = (seedValue: string, count = 72) => {
  const seed = hashWaveSeed(seedValue);

  const barNoise = (index: number) => {
    // Deterministic per-bar pseudo-random value in [0, 1].
    const n = hashWaveSeed(`${seed}-${index * 7919}`);
    return n / 0xffffffff;
  };

  const profileA = 1.8 + (seed % 11) * 0.17;
  const profileB = 3.6 + ((seed >>> 4) % 13) * 0.11;
  const accentStride = 4 + ((seed >>> 9) % 6);

  const raw = Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1);
    const n1 = barNoise(i);
    const n2 = barNoise(i + 97);

    const wave = Math.abs(Math.sin(t * Math.PI * profileA + n1 * 1.2)) * 0.38;
    const harmonic = Math.abs(Math.cos(t * Math.PI * profileB + n2 * 1.8)) * 0.28;
    const randomBody = Math.pow(n1, 1.45) * 0.42;
    const accent = i % accentStride === 0 ? 0.16 + n2 * 0.18 : 0;

    return Math.max(0.05, Math.min(1, 0.1 + wave + harmonic + randomBody + accent));
  });

  // Light smoothing to avoid jitter while keeping message-to-message uniqueness.
  return raw.map((_, i) => {
    const prev = raw[Math.max(0, i - 1)];
    const curr = raw[i];
    const next = raw[Math.min(raw.length - 1, i + 1)];
    return Math.max(0.05, Math.min(1, prev * 0.14 + curr * 0.72 + next * 0.14));
  });
};

function AudioMessageBubble({
  url,
  duration,
  seedKey,
  amplitudes,
  textColor,
  isSending,
}: {
  url: string;
  duration?: number;
  seedKey: string;
  amplitudes?: number[];
  textColor: string;
  isSending?: boolean;
}) {
  const player = useAudioPlayer(url, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const [waveWidth, setWaveWidth] = useState(0);
  const waveform = useMemo(() => {
    if (Array.isArray(amplitudes) && amplitudes.length > 0) {
      return amplitudes
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.max(0, Math.min(1, value)));
    }

    return createSeededAmplitudes(`${seedKey}|${url}|${Math.round(duration || 0)}`);
  }, [seedKey, url, duration, amplitudes]);
  const totalDuration = duration || status.duration || 0;
  const progress = totalDuration > 0 ? Math.min(1, status.currentTime / totalDuration) : 0;
  const shouldShowCurrentTime = status.playing || (status.currentTime > 0 && !status.didJustFinish);
  const displayTime = shouldShowCurrentTime ? status.currentTime : totalDuration;
  const displayProgress = shouldShowCurrentTime ? progress : 0;

  const handleTogglePlayback = async () => {
    if (isSending) return;

    if (status.playing) {
      player.pause();
      return;
    }

    const atEnd = totalDuration > 0 && status.currentTime >= totalDuration - 0.15;
    if (status.didJustFinish || atEnd) {
      await player.seekTo(0);
    }

    player.play();
  };

  return (
    <TouchableOpacity
      onPress={() => {
        void handleTogglePlayback();
      }}
      activeOpacity={0.8}
    >
      <View style={{ minWidth: 170, maxWidth: 230, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isSending ? 'rgba(10,73,161,0.45)' : '#0756C2', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name={status.playing ? 'pause' : 'play-arrow'} size={23} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View
            onLayout={(event) => {
              const next = Math.floor(event.nativeEvent.layout.width);
              if (next > 0 && Math.abs(next - waveWidth) > 1) {
                setWaveWidth(next);
              }
            }}
            style={{ overflow: 'hidden' }}
          >
            <AudioWaveform
              width={waveWidth || 118}
              height={18}
              amplitudes={waveform}
              progress={displayProgress}
              activeColor="#0756C2"
              inactiveColor="rgba(7,86,194,0.5)"
              barWidth={3}
              barGap={2.5}
            />
          </View>
          <Text style={{ color: '#3B6FAF', fontSize: 12, marginTop: 4, opacity: 0.95, fontWeight: '700' }}>
            {formatDuration(displayTime)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessageBubble({ message, onPress, highlightQuery, onAvatarPress, isLastInGroup, isThreadLast, onReply, isHighlighted, onReplyPress, progress }: { message: ChatMessage, onPress?: () => void, highlightQuery?: string, onAvatarPress?: () => void, isLastInGroup?: boolean, isThreadLast?: boolean, onReply?: () => void, isHighlighted?: boolean, onReplyPress?: (id: string) => void, progress?: number }) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { allMedia } = useChatThread();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const swipeableRef = React.useRef<Swipeable>(null);

  // derive list of image URIs (and their message ids) from entire thread
  // we also keep the corresponding message ids so we can find the correct
  // index when an image URI appears multiple times in the thread.
  const { threadImageUris, threadImageIds } = useMemo(() => {
    const uris: string[] = [];
    const ids: string[] = [];
    // Only use allMedia to build the full array of images for the viewer
    const sourceImages = allMedia && allMedia.length > 0 ? allMedia : [];
    sourceImages.forEach(m => {
      if ((m.type === 'image' || m.type === 'video') && m.fileInfo?.url) {
        let uri = resolveMediaUri(m.fileInfo?.url || '');
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

  const highlightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.delay(1500),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isHighlighted, highlightAnim]);

  // Unify URI building for cache and source for this message
  const fullImageUri = useMemo(() => {
    if (message.type !== 'image' || !message.fileInfo) return null;
    let url = message.fileInfo.url;
    if (!url) return null;
    return resolveMediaUri(url);
  }, [message.type, message.fileInfo]);

  const [imgSize, setImgSize] = useState<{width:number;height:number} | null>(() => {
    if (fullImageUri && IMAGE_SIZE_CACHE.has(fullImageUri)) {
      return IMAGE_SIZE_CACHE.get(fullImageUri)!;
    }
    return null;
  });

  const [localThumb, setLocalThumb] = useState<string | null>(null);

  useEffect(() => {
    if (message.status === 'sending' && message.fileInfo?.url) {
      if (message.type === 'video') {
        // Video thumbnail generation
        (async () => {
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(message.fileInfo!.url!, {
              time: 0,
            });
            setLocalThumb(uri);
          } catch (e) {
            console.warn('Local video thumb failed', e);
          }
        })();
      } else if (message.type === 'image') {
        // For images, we just use the local URI as the thumb
        setLocalThumb(message.fileInfo.url);
      }
    }
  }, [message.status, message.fileInfo, message.type]);

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

  if (message.type === 'audio') {
    bubbleBg = isOutgoing ? '#6FAEFF' : '#DDEBFF';
    borderColor = isOutgoing ? '#6FAEFF' : '#DDEBFF';
    textColor = '#0F3E84';
  }

  const animatedBorderStyle = {
    borderColor: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [borderColor, colors.tint],
    }),
    borderWidth: 1, // Keep fixed width or animate if desired
    shadowColor: colors.tint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
    }),
    shadowRadius: highlightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    }),
  };

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

  if (message.type === 'video' && message.fileInfo && message.fileInfo.url) {
    let url = message.fileInfo.url;
    url = resolveMediaUri(url);
    const maxWidth = screenWidth * 0.75;
    const displayThumb = message.fileInfo.thumbnailUrl ? resolveMediaUri(message.fileInfo.thumbnailUrl) : localThumb;

    contentElement = (
      <>
        <TouchableOpacity
        onPress={() => {
          if (message.status === 'sending') return;
          let idx = -1;
          if (message.id != null) {
            idx = threadImageIds.indexOf(message.id.toString());
          }
          if (idx === -1) {
            idx = threadImageUris.indexOf(url);
          }
          let imagesForViewer = threadImageUris;
          if (idx === -1) {
            imagesForViewer = [...threadImageUris, url];
            idx = imagesForViewer.length - 1;
          }

          setSelectedIndex(idx);
          setViewerVisible(true);
        }}
        activeOpacity={0.9}
      >
        <View style={{ borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', width: maxWidth, height: maxWidth * 1 }} pointerEvents="none">
          {message.status === 'sending' ? (
            <Image source={{ uri: displayThumb || url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <>
               <InlineVideoPlayer url={url} />
               {displayThumb && (
                  <Image 
                    source={{ uri: displayThumb }} 
                    style={{ ...StyleSheet.absoluteFillObject, zIndex: -1 }} 
                    contentFit="cover"
                  />
               )}
            </>
          )}
          
          {message.status === 'sending' && (
            <View style={{ 
              ...StyleSheet.absoluteFillObject, 
              backgroundColor: 'rgba(0,0,0,0.3)', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}>
              <CircularProgress 
                size={60}
                strokeWidth={4}
                progress={progress || 0}
                color="#0084FF"
                backgroundColor="rgba(255,255,255,0.2)"
              />
              {message.fileInfo?.size && (
                <Text style={{ 
                  color: '#fff', 
                  fontSize: 12, 
                  marginTop: 12, 
                  fontWeight: '700', 
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  overflow: 'hidden'
                }}>
                  {(( (progress || 0) * message.fileInfo.size) / (1024 * 1024)).toFixed(1)}MB / {(message.fileInfo.size / (1024 * 1024)).toFixed(1)}MB
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
      <FullscreenImageViewer
        visible={viewerVisible}
        images={
          url && selectedIndex >= threadImageUris.length
            ? [...threadImageUris, url]
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
  } else if (message.type === 'sticker') {
    contentElement = (
      <Image source={{ uri: 'https://via.placeholder.com/120x120.png?text=STK' }} style={{ width: 120, height: 120, borderRadius: 12 }} />
    );
  } else if (message.type === 'image' && message.fileInfo && fullImageUri) {
    const maxWidth = screenWidth * 0.75;
    contentElement = (
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
          <View>
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
            {message.status === 'sending' && (
              <View style={{ 
                ...StyleSheet.absoluteFillObject, 
                backgroundColor: 'rgba(0,0,0,0.3)', 
                justifyContent: 'center', 
                alignItems: 'center',
                borderRadius: 12
              }}>
                <CircularProgress 
                  size={40}
                  strokeWidth={2}
                  progress={progress || 0}
                  color="#0084FF"
                  backgroundColor="rgba(255,255,255,0.2)"
                />
                {message.fileInfo?.size && (
                  <Text style={{ 
                    color: '#fff', 
                    fontSize: 10, 
                    marginTop: 6, 
                    fontWeight: '700', 
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    {(( (progress || 0) * message.fileInfo.size) / (1024 * 1024)).toFixed(1)}MB / {(message.fileInfo.size / (1024 * 1024)).toFixed(1)}MB
                  </Text>
                )}
              </View>
            )}
          </View>
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
  } else if (message.type === 'audio' && message.fileInfo) {
    const uri = resolveMediaUri(message.fileInfo.url);
    contentElement = (
      <AudioMessageBubble
        url={uri}
        duration={message.fileInfo.duration}
        seedKey={message.id}
        amplitudes={message.fileInfo.waveform}
        textColor={textColor}
        isSending={message.status === 'sending'}
      />
    );
  } else if (message.type === 'file' && message.fileInfo) {
    let { url, name, size, mime } = message.fileInfo;
    if (mime?.startsWith('audio/')) {
      const uri = resolveMediaUri(url);
      contentElement = (
        <AudioMessageBubble
          url={uri}
          duration={message.fileInfo.duration}
          seedKey={message.id}
          amplitudes={message.fileInfo.waveform}
          textColor={textColor}
          isSending={message.status === 'sending'}
        />
      );
    } else {
    let uri = url;
    uri = resolveMediaUri(uri);

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
    }
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
                <Text style={{ color: '#fff', fontWeight: '700' }}>{getInitials(message.contactName)}</Text>
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

  const renderLeftActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [0, 50, 100],
      outputRange: [0, 1, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ width: 68, backgroundColor: colors.background }}>
        <View className="flex-row justify-start px-4 my-2">
          <Animated.View style={{ transform: [{ scale }], width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="reply" size={24} color={colors.icon} />
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ width: 68, backgroundColor: colors.background }}>
        <View className="flex-row justify-end px-4 my-2">
          <Animated.View style={{ transform: [{ scale }], width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="reply" size={24} color={colors.icon} />
          </Animated.View>
        </View>
      </View>
    );
  };

  const replyBlock = message.replyTo && (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={() => message.replyTo.id && onReplyPress?.(message.replyTo.id)}
      style={{ backgroundColor: isOutgoing ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 8, padding: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: colors.tint, flexDirection: 'row', alignItems: 'center' }}
    >
      {(message.replyTo.type === 'image' || message.replyTo.type === 'image_group') && (
        <View style={{ width: 36, height: 36, marginRight: 8, borderRadius: 4, overflow: 'hidden' }}>
          <Image 
            source={{ 
              uri: (() => {
                let url = message.replyTo.type === 'image_group' ? message.replyTo.images?.[0]?.fileInfo?.url : message.replyTo.fileInfo?.url;
                if (!url && message.replyTo.type === 'image') {
                  try {
                    const info = typeof message.replyTo.content === 'string' ? JSON.parse(message.replyTo.content) : message.replyTo.content;
                    url = info?.url;
                  } catch {
                    url = message.replyTo.content;
                  }
                }
                if (!url) return undefined;
                if (url.startsWith('http')) return url;
                return getAvatarUrl(url) || url;
              })()
            }} 
            style={{ width: '100%', height: '100%', backgroundColor: colors.surfaceVariant }}
            contentFit="cover"
          />
        </View>
      )}
      <View style={{ flexShrink: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: isOutgoing ? colors.bubbleMeText : colors.bubbleOtherText, marginBottom: 2 }}>
          {message.replyTo.sender?.fullName || 'Người dùng'}
        </Text>
        <Text style={{ fontSize: 13, color: isOutgoing ? 'rgba(255,255,255,0.85)' : colors.textSecondary }} numberOfLines={1} ellipsizeMode="tail">
          {message.replyTo.type === 'text' ? message.replyTo.content?.replace(/\n/g, ' ') : (message.replyTo.type === 'image' || message.replyTo.type === 'image_group' ? '[Hình ảnh]' : (message.replyTo.type === 'video' ? '[Video]' : (message.replyTo.type === 'audio' ? '[Bản ghi âm]' : '[Tệp]')))}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ position: 'relative' }}>
      {!message.fromMe && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 }} pointerEvents="box-none">
          <View className={`flex-row justify-start px-4 my-2`}>
            <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8} style={{ opacity: isLastInGroup ? 1 : 0 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceVariant, overflow: 'hidden' }}>
                {message.contactAvatar ? (
                  <Image source={{ uri: message.contactAvatar }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{getInitials(message.contactName)}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={!message.fromMe ? renderLeftActions : undefined}
        renderRightActions={message.fromMe ? renderRightActions : undefined}
        onSwipeableWillOpen={() => {
          if (onReply) onReply();
          swipeableRef.current?.close();
        }}
        containerStyle={{ zIndex: 2 }}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <View className={`flex-row ${message.fromMe ? 'justify-end' : 'justify-start'} px-4 my-2`}> 
          {!message.fromMe && (
            <View style={{ width: 40, height: 40 }} />
          )}

        <View style={{ maxWidth: '72%', marginLeft: isOutgoing ? 'auto' : 12 }} className={`${isOutgoing ? 'items-end' : 'items-start'}`}> 
            {/* for image attachments we don’t show the standard bubble styling */}
        <Animated.View style={[{
            backgroundColor: (message.type === 'image' || message.type === 'image_group' || message.type === 'video') ? 'transparent' : bubbleBg,
            borderWidth: (message.type === 'image' || message.type === 'image_group' || message.type === 'video') ? 0 : 1,
            padding: (message.type === 'image' || message.type === 'image_group' || message.type === 'video') ? 0 : 12,
            borderRadius: 18,
            marginBottom: isLastInGroup ? 0 : -8
          }, (message.type !== 'image' && message.type !== 'image_group' && message.type !== 'video') ? animatedBorderStyle : {}]}>
            {replyBlock}
            {contentElement}
          </Animated.View>

          {isLastInGroup && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
              <Text style={{ color: timeColor, fontSize: 12, marginRight: isOutgoing ? 0 : 8, marginLeft: isOutgoing ? 8 : 0 }}>
                {message.status === 'sending' ? (
                  <Text style={{ color: timeColor, fontSize: 12 }}>Đang gửi</Text>
                ) : (isOutgoing && isThreadLast) ? (
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
                        {getInitials(u.fullName)}
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
      </Swipeable>
    </View>
  );
}
