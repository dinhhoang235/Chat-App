import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Text,
  useWindowDimensions,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { useVideoPlayer, VideoView } from 'expo-video';
import Slider from '@react-native-community/slider';
import VideoThumbnail from '../chat/VideoThumbnail';

export type UserInfo = {
  name: string;
  avatarUrl?: string;
};

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  userInfo?: UserInfo;
};

const ZoomableImage = ({
  uri,
  width,
  height,
  insets,
  isLandscape,
  isZoomed,
  onToggleControls,
  onZoomChange,
  onClose,
  nativeGesture,
  isActive,
  showControls,
}: {
  uri: string;
  width: number;
  height: number;
  insets: { top: number; bottom: number };
  isLandscape: boolean;
  isZoomed: boolean;
  onToggleControls: () => void;
  onZoomChange: (zoomed: boolean) => void;
  onClose: () => void;
  nativeGesture: ReturnType<typeof Gesture.Native>;
  isActive: boolean;
  showControls: boolean;
}) => {
  const scale = useSharedValue(1);
  const lastScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const translateYClose = useSharedValue(0);
  const opacity = useSharedValue(1);

  const resetZoom = () => {
    'worklet';
    scale.value = withSpring(1);
    lastScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    lastTranslateX.value = 0;
    lastTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      lastScale.value = scale.value;
    })
    .onUpdate(e => {
      scale.value = Math.min(Math.max(lastScale.value * e.scale, 0.5), 5);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetZoom();
        scheduleOnRN(onZoomChange, false);
      } else {
        lastScale.value = scale.value;
        scheduleOnRN(onZoomChange, scale.value > 1);
      }
    });

  const panGesture = Gesture.Pan()
    .simultaneousWithExternalGesture(nativeGesture)
    .enabled(isZoomed)
    .onUpdate(e => {
      if (scale.value > 1) {
        translateX.value = lastTranslateX.value + e.translationX;
        translateY.value = lastTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > 1) {
        lastTranslateX.value = translateX.value;
        lastTranslateY.value = translateY.value;
      }
    });

  const swipeDownGesture = Gesture.Pan()
    .enabled(!isZoomed)
    .simultaneousWithExternalGesture(nativeGesture)
    .activeOffsetY([10, 10])
    .failOffsetX([-10, 10])
    .onUpdate(e => {
      if (e.translationY > 0) {
        translateYClose.value = e.translationY;
        opacity.value = 1 - e.translationY / 300;
      }
    })
    .onEnd(e => {
      if (e.translationY > 120 || e.velocityY > 800) {
        translateYClose.value = withSpring(height);
        opacity.value = withSpring(0);
        scheduleOnRN(onClose);
      } else {
        translateYClose.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        resetZoom();
        scheduleOnRN(onZoomChange, false);
      } else {
        scale.value = withSpring(2);
        lastScale.value = 2;
        scheduleOnRN(onZoomChange, true);
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .requireExternalGestureToFail(doubleTapGesture)
    .onEnd(() => {
      if (!isLandscape) scheduleOnRN(onToggleControls);
    });

  const combinedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    swipeDownGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + translateYClose.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const isVideo = uri.match(/\.(mp4|mov|m4v|avi|webm)(\?.*)?$/i);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const [manuallyPaused, setManuallyPaused] = useState(false);
  
  const player = useVideoPlayer(isVideo ? uri : null, player => {
    player.loop = true;
    if (isVideo && isActive) {
      player.play();
    }
  });

  // Handle auto-play/pause on swipe
  useEffect(() => {
    if (!player || !isVideo) return;
    if (isActive && !manuallyPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, manuallyPaused, isVideo, player]);

  // Reset manual pause when swiping away
  useEffect(() => {
    if (!isActive) setManuallyPaused(false);
  }, [isActive]);

  // Sync player state for custom controls
  useEffect(() => {
    if (!player || !isVideo) return;
    const sub = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying);
    });
    const interval = setInterval(() => {
      if (!isSeeking && player.duration > 0) {
        setCurrentTime(player.currentTime);
        setDuration(player.duration);
      }
    }, 500);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [player, isVideo, isSeeking]);

  return (
    <Animated.View
      style={[
        {
          width,
          height: height - insets.top - insets.bottom,
          marginTop: insets.top,
          justifyContent: 'center',
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={combinedGesture}>
        <View style={{ width: '100%', height: '100%' }}>
          {isVideo ? (
            <View style={{ width: '100%', height: '100%' }}>
              <VideoView
                style={{ width: '100%', height: '100%' }}
                player={player}
                nativeControls={false}
                contentFit="contain"
              />
              {/* Transparent overlay to catch taps ONLY when NOT interacting with controls */}
              <Pressable 
                style={StyleSheet.absoluteFill} 
                onPress={onToggleControls} 
              />
            </View>
          ) : (
            <Image
              source={{ uri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </GestureDetector>

      {/* Custom Seek Bar Row — High-level sibling to avoid interception */}
      {isVideo && showControls && (
        <View 
          pointerEvents="box-none" // Allows touches to reach children but container itself is transparent
          style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', zIndex: 9999 }]}
        >
          <Pressable 
            onPress={(e) => e.stopPropagation()} // Stop bubbling to GestureDetector
            style={{ 
              backgroundColor: 'rgba(0,0,0,0.6)', 
              paddingVertical: 12, 
              paddingHorizontal: 16,
              marginBottom: 110 + insets.bottom,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Play/Pause Button */}
            <TouchableOpacity 
               onPress={() => {
                 if (isPlaying) {
                   setManuallyPaused(true);
                 } else {
                   setManuallyPaused(false);
                 }
               }}
               hitSlop={{ top: 25, bottom: 25, left: 30, right: 30 }}
               style={{ 
                 width: 50, 
                 height: 50, 
                 justifyContent: 'center', 
                 alignItems: 'center', 
                 marginRight: 15,
                 marginLeft: 5, // Small gap from edge to avoid gesture conflict
               }}
            >
              <MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={36} color="#fff" />
            </TouchableOpacity>

            {/* Current Time */}
            <Text style={{ color: '#fff', fontSize: 13, fontVariant: ['tabular-nums'], marginRight: 10 }}>
              {formatTime(isSeeking ? seekValue : currentTime)}
            </Text>

            {/* Slider */}
            <Slider
              style={{ flex: 1, height: 40 }}
              minimumValue={0}
              maximumValue={duration || 1}
              value={isSeeking ? seekValue : currentTime}
              onValueChange={(value) => {
                setIsSeeking(true);
                setSeekValue(value);
              }}
              onSlidingComplete={(value) => {
                player.currentTime = value;
                setCurrentTime(value);
                setIsSeeking(false);
              }}
              minimumTrackTintColor="#00A3FF"
              maximumTrackTintColor="rgba(255,255,255,0.4)"
              thumbTintColor="#FFFFFF"
            />

            {/* Total Time */}
            <Text style={{ color: '#fff', fontSize: 13, fontVariant: ['tabular-nums'], marginLeft: 10 }}>
              {formatTime(duration)}
            </Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
};

export default function FullscreenImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
  userInfo,
}: Props) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  const displayImages = React.useMemo(() => [...images].reverse(), [images]);
  const displayInitial = displayImages.length - 1 - initialIndex;

  const [currentIndex, setCurrentIndex] = useState(displayInitial);
  const [isZoomed, setIsZoomed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Controls are shown only when: controlsVisible=true, not zoomed, not landscape
  const showControls = controlsVisible && !isZoomed && !isLandscape;

  const listRef = useRef<FlatList<string>>(null);
  const nativeGesture = Gesture.Native();
  const footerRef = useRef<ScrollView>(null);

  const scrollFooterToCenter = useCallback((index: number, animated = true) => {
    if (footerRef.current && displayImages.length > 0) {
      const thumbSize = 48;
      const margin = 8;
      const centerOffset = width / 2 - thumbSize / 2;
      const x = index * (thumbSize + margin) - centerOffset + 12;
      footerRef.current.scrollTo({ x: Math.max(0, x), animated });
    }
  }, [displayImages.length, width]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(displayInitial);
      setIsZoomed(false);
      setControlsVisible(true);
      
      // Small timeout to ensure FlatList and ScrollView are ready
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: displayInitial, animated: false });
        scrollFooterToCenter(displayInitial, false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [displayInitial, visible, isLandscape, scrollFooterToCenter]);

  useEffect(() => {
    if (visible && !isLandscape) {
      scrollFooterToCenter(currentIndex, true);
    }
  }, [currentIndex, visible, isLandscape, scrollFooterToCenter]);

  if (!visible) return null;

  const onViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
      setIsZoomed(false);
    }
  };

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  const renderItem = ({ item, index }: { item: string; index: number }) => (
    <ZoomableImage
      uri={item}
      width={width}
      height={height}
      insets={insets}
      isLandscape={isLandscape}
      isZoomed={isZoomed}
      onToggleControls={() => setControlsVisible(c => !c)}
      onZoomChange={setIsZoomed}
      onClose={onClose}
      nativeGesture={nativeGesture}
      isActive={index === currentIndex}
      showControls={showControls}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'black' }}>

        {/* ✅ FIX: Header — luôn render, dùng opacity + pointerEvents để ẩn/hiện
            Tránh unmount/remount làm ảnh thumbnail bị reload */}
        <View
          pointerEvents={showControls ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            top: insets.top,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 10,
            opacity: showControls ? 1 : 0,
          }}
        >
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <MaterialIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          {userInfo && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              {userInfo.avatarUrl && (
                <Image
                  source={{ uri: userInfo.avatarUrl }}
                  style={{ width: 32, height: 32, borderRadius: 16, marginRight: 6 }}
                />
              )}
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
                {userInfo.name}
              </Text>
            </View>
          )}
        </View>

        <GestureDetector gesture={nativeGesture}>
          <FlatList
            ref={listRef}
            data={displayImages}
            horizontal
            pagingEnabled
            keyExtractor={(u, i) => u + i}
            renderItem={renderItem}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={displayInitial}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            scrollEnabled={!isZoomed}
          />
        </GestureDetector>

        {/* ✅ FIX: Footer — luôn render, dùng opacity + pointerEvents để ẩn/hiện
            Image thumbnail KHÔNG bị unmount → KHÔNG reload ảnh */}
        <View
          pointerEvents={showControls ? 'auto' : 'none'}
          style={{
            position: 'absolute',
            bottom: insets.bottom,
            left: 0,
            right: 0,
            paddingVertical: 8,
            backgroundColor: 'rgba(0,0,0,0.8)',
            opacity: showControls ? 1 : 0,
          }}
        >
          <ScrollView
            ref={footerRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          >
            {displayImages.map((uri, idx) => {
              const isVid = uri.match(/\.(mp4|mov|m4v|avi|webm)(\?.*)?$/i);
              return (
              <TouchableOpacity
                key={uri + idx}
                onPress={() => {
                  listRef.current?.scrollToIndex({ index: idx });
                  setCurrentIndex(idx);
                }}
                style={{
                  marginRight: 8,
                  borderWidth: currentIndex === idx ? 2 : 0,
                  borderColor: colors.tint,
                }}
              >
                {isVid ? (
                  <VideoThumbnail uri={uri} style={{ width: 48, height: 48 }} />
                ) : (
                  <View style={{ width: 48, height: 48 }}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                )}
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

      </Animated.View>
    </Modal>
  );
}