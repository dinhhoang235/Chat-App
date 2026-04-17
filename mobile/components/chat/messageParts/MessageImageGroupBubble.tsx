import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import FullscreenImageViewer from '../../modals/FullscreenImageViewer';
import { getAvatarUrl } from '@/utils/avatar';
import { resolveMediaUri } from './messageHelpers';

type MessageImageGroupBubbleProps = {
  message: any;
  screenWidth: number;
  colors: any;
  allMedia?: any[];
};

export default function MessageImageGroupBubble({ message, screenWidth, colors, allMedia }: MessageImageGroupBubbleProps) {
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
              const cachedSize = IMAGE_SIZE_CACHE.get(uri);
              const isLand = cachedSize ? cachedSize.width > cachedSize.height : true;
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
              overflow: 'hidden',
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
}

const IMAGE_SIZE_CACHE = new Map<string, { width: number; height: number }>();
