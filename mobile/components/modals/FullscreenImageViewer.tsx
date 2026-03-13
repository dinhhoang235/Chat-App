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

  return (
    <GestureDetector gesture={combinedGesture}>
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
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
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

  const renderItem = ({ item }: { item: string }) => (
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
            {displayImages.map((uri, idx) => (
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
                <Image source={{ uri }} style={{ width: 48, height: 48 }} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

      </Animated.View>
    </Modal>
  );
}