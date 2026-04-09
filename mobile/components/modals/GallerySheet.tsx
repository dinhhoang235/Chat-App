import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { getInfoAsync } from 'expo-file-system/legacy';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

const COLUMN_COUNT = 3;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = SCREEN_WIDTH / COLUMN_COUNT - 2;

type FileObject = { uri: string; name?: string; type?: string; size?: number; duration?: number };

type GallerySheetProps = {
  visible: boolean;
  onClose: () => void;
  attachments: FileObject[];
  addAttachment: (file: FileObject) => void;
  removeAttachment: (arg: number | string) => void;
  /** Chiều cao sheet — bằng chiều cao bàn phím */
  height?: number;
};

export default function GallerySheet({
  visible,
  onClose,
  attachments,
  addAttachment,
  removeAttachment,
  height,
}: GallerySheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [after, setAfter] = useState<string | undefined>(undefined);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Snap to open or close when visible changes
  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const snapPoints = useMemo(() => {
    const h = height ?? Math.round(Dimensions.get('window').height * 0.35);
    return [h];
  }, [height]);

  const loadAssets = useCallback(async () => {
    if (!hasPermission) return;
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        first: 50,
        after,
        sortBy: ['modificationTime'],
      });
      setAssets(prev => [...prev, ...result.assets]);
      setAfter(result.endCursor || undefined);
      setHasMore(result.hasNextPage);
    } catch (e) {
      console.error('Failed to load assets', e);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, after, hasPermission]);

  useEffect(() => {
    let mounted = true;
    const ensurePermAndLoad = async () => {
      if (hasPermission === null) {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (!mounted) return;
          setHasPermission(status === 'granted');
          if (status === 'granted') {
            setAssets([]);
            setAfter(undefined);
            setHasMore(true);
            await loadAssets();
          }
        } catch (e) {
          console.warn('Permission request failed', e);
        }
      } else if (visible && hasPermission) {
        await loadAssets();
      }
    };
    if (visible) ensurePermAndLoad();
    return () => { mounted = false; };
  }, [visible, loadAssets, hasPermission]);

  const toggleAsset = useCallback(async (asset: MediaLibrary.Asset) => {
    const uri = asset.uri;
    const existing = attachments.find(a => a.uri === uri);
    
    if (existing) {
      removeAttachment(uri);
    } else if (attachments.length < 10) {
      // Fetch full info to get fileSize
      let size = (asset as any).fileSize;
      if (!size) {
        try {
          const info = await getInfoAsync(asset.uri);
          if (info.exists) size = (info as any).size;
        } catch (e) {
          console.warn('Failed to get asset info from FileSystem', e);
        }
      }

      const file: FileObject = {
        uri,
        name: asset.filename,
        type: asset.mediaType === 'photo' ? 'image/jpeg' : (asset.mediaType === 'video' ? 'video/mp4' : undefined),
        size,
        duration: asset.duration,
      };
      addAttachment(file);
    }
  }, [attachments, addAttachment, removeAttachment]);

  const data = useMemo<(MediaLibrary.Asset | 'camera')[]>(
    () => (['camera', ...assets] as (MediaLibrary.Asset | 'camera')[]),
    [assets]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      const row = Math.floor(index / COLUMN_COUNT);
      return { length: ITEM_SIZE, offset: row * ITEM_SIZE, index };
    },
    []
  );

  const styles = useMemo(() => StyleSheet.create({
    cameraCell: { width: ITEM_SIZE, height: ITEM_SIZE, justifyContent: 'center', alignItems: 'center' },
    image: { width: ITEM_SIZE, height: ITEM_SIZE, margin: 1, backgroundColor: '#eee' },
    itemContainer: { width: ITEM_SIZE, height: ITEM_SIZE, borderWidth: 1, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
    badge: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.tint, borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
    emptyBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, width: 24, height: 24, borderWidth: 1.5, borderColor: '#fff' },
  }), [colors]);

  const openCamera = useCallback(async () => {
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (camPerm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access.');
        return;
      }
    } catch (e) {
      console.warn('Camera permission error', e);
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      let size = (asset as any).fileSize;
      if (!size) {
        try {
          const info = await getInfoAsync(asset.uri);
          if (info.exists) size = (info as any).size;
        } catch (e) {
          console.warn('Failed to get camera file info', e);
        }
      }
      addAttachment({
        uri: asset.uri,
        name: asset.uri.split('/').pop(),
        type: asset.type ? `${asset.type}/jpeg` : 'image/jpeg',
        size,
      });
    }
  }, [addAttachment]);

  const renderItem = useCallback(({ item }: { item: MediaLibrary.Asset | 'camera' }) => {
    if (item === 'camera') {
      return (
        <TouchableOpacity style={styles.cameraCell} onPress={openCamera}>
          <MaterialIcons name="camera-alt" size={32} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    }
    const asset = item as MediaLibrary.Asset;
    const selectedIndex = attachments.findIndex(a => a.uri === asset.uri);
    return (
      <TouchableOpacity onPress={() => toggleAsset(asset)} style={styles.itemContainer}>
        <Image
          source={{ uri: asset.uri }}
          onError={e => console.warn('GallerySheet image error', e.nativeEvent)}
          style={styles.image}
        />
        {asset.mediaType === 'video' && asset.duration > 0 && (
          <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
              {Math.floor(asset.duration / 60).toString().padStart(2, '0')}:{Math.floor(asset.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        )}
        {selectedIndex !== -1 ? (
          <View style={styles.badge}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{selectedIndex + 1}</Text>
          </View>
        ) : (
          <View style={styles.emptyBadge} />
        )}
      </TouchableOpacity>
    );
  }, [attachments, toggleAsset, colors, openCamera, styles]);


  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      handleComponent={null}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      enableDynamicSizing={false}
      containerStyle={{ pointerEvents: 'box-none' }}
    >
        <FlatList
          data={data}
          keyExtractor={(item, idx) => (item === 'camera' ? 'camera' : (item as MediaLibrary.Asset).id)}
          numColumns={COLUMN_COUNT}
          renderItem={renderItem}
          onEndReached={loadAssets}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 12 }} color={colors.tint} /> : null}
          initialNumToRender={12}
          maxToRenderPerBatch={24}
          windowSize={5}
          removeClippedSubviews
          getItemLayout={getItemLayout}
        />
    </BottomSheet>
  );
}
