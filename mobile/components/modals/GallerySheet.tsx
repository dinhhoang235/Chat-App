import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';

const COLUMN_COUNT = 4;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = SCREEN_WIDTH / COLUMN_COUNT - 2;

type FileObject = { uri: string; name?: string; type?: string; size?: number };

type GallerySheetProps = {
  visible: boolean;
  onClose: () => void;
  attachments: FileObject[];
  addAttachment: (file: FileObject) => void;
  removeAttachment: (arg: number | string) => void;
  inline?: boolean;
};

export default function GallerySheet({
  visible,
  onClose,
  attachments,
  addAttachment,
  removeAttachment,
  inline = false,
}: GallerySheetProps) {
  const { colors } = useTheme();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [after, setAfter] = useState<string | undefined>(undefined);

  const loadAssets = React.useCallback(async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Media library permission not granted');
      return;
    }
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo'],
        first: 50,
        after,
        sortBy: ['creationTime'],
      });
      setAssets(prev => [...prev, ...result.assets]);
      setAfter(result.endCursor || undefined);
      setHasMore(result.hasNextPage);
    } catch (e) {
      console.error('Failed to load assets', e);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, after]);

  useEffect(() => {
    if (visible) {
      loadAssets();
    }
  }, [visible, loadAssets]);

  const toggleAsset = (asset: MediaLibrary.Asset) => {
    const uri = asset.uri;
    const existing = attachments.find(a => a.uri === uri);
    const file: FileObject = {
      uri,
      name: asset.filename,
      type: asset.mediaType === 'photo' ? 'image/jpeg' : undefined,
      size: (asset as any).fileSize,
    };
    if (existing) {
      removeAttachment(uri);
    } else if (attachments.length < 10) {
      addAttachment(file);
    } else {
      alert('Tối đa 10 ảnh');
    }
  };

  const renderItem = ({ item }: { item: MediaLibrary.Asset | 'camera' }) => {
    if (item === 'camera') {
      return (
        <TouchableOpacity
          style={{ width: ITEM_SIZE, height: ITEM_SIZE, justifyContent: 'center', alignItems: 'center' }}
          onPress={openCamera}
        >
          <MaterialIcons name="camera-alt" size={32} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    }
    const asset = item as MediaLibrary.Asset;
    const selectedIndex = attachments.findIndex(a => a.uri === asset.uri);
    return (
      <TouchableOpacity onPress={() => toggleAsset(asset)}>
        <Image
          source={{ uri: asset.uri }}
          style={{ width: ITEM_SIZE, height: ITEM_SIZE, margin: 1 }}
        />
        {selectedIndex !== -1 && (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: colors.tint,
              borderRadius: 10,
              width: 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12 }}>{selectedIndex + 1}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const openCamera = async () => {
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
      const file: FileObject = {
        uri: asset.uri,
        name: asset.uri.split('/').pop(),
        type: asset.type ? `${asset.type}/jpeg` : 'image/jpeg',
        size: (asset as any).fileSize,
      };
      addAttachment(file);
    }
  };

  // sheet contents reused for both inline and modal modes
  const sheetContent = (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        height: '30%',
      }}
    >
      <View style={{ width: 40, height: 4, backgroundColor: colors.surfaceVariant, alignSelf: 'center', marginVertical: 8, borderRadius: 2 }} />
      <FlatList
        data={[ 'camera', ...assets ]}
        keyExtractor={(item, idx) => (item === 'camera' ? 'camera' : (item as MediaLibrary.Asset).id)}
        numColumns={COLUMN_COUNT}
        renderItem={renderItem}
        onEndReached={loadAssets}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 12 }} color={colors.tint} /> : null}
      />
    </View>
  );

  if (inline) {
    if (!visible) return null;
    return (
      <View style={{ position: 'relative' }}>
        {/* invisible overlay occupying space above sheet */}
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: '30%',
          }}
          onPress={onClose}
        />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceVariant }}>
          {sheetContent}
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {sheetContent}
        </View>
      </>
    </Modal>
  );
}
