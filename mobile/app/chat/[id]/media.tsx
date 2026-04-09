import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, Linking, StyleSheet, SectionList } from 'react-native';
import { useTheme } from '@/context/themeContext';
import { Header, FullscreenImageViewer, VideoThumbnail } from '@/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatThread } from '@/hooks/useChatThread';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getAvatarUrl } from '@/utils/avatar';

const TABS = ['Ảnh', 'File', 'Link'];

type ChatMessage = any; // reuse dynamic type from hook

export default function ChatMedia() {
  const { colors } = useTheme();
  const router = useRouter();

  // reuse chat thread to access messages for this conversation
  const { allMedia, fetchAllMedia } = useChatThread();
  const [selectedTab, setSelectedTab] = useState<string>(TABS[0]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    // fetch initial media instead of partial messages
    fetchAllMedia();
  }, [fetchAllMedia]);

  const imageMessages = allMedia.filter(m => (m.type === 'image' || m.type === 'video') && m.fileInfo?.url);
  const fileMessages = allMedia.filter(m => m.type === 'file' && m.fileInfo?.url);
  const linkMessages = allMedia.filter(
    m =>
      m.type === 'text' &&
      typeof m.content === 'string' &&
      /(https?:\/\/\S+)/.test(m.content),
  );

  const groupedImages = useMemo(() => {
    const groups: { [key: string]: ChatMessage[] } = {};
    const order: string[] = [];
    imageMessages.forEach((m) => {
      const d = new Date(m.createdAt);
      const label = `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
      if (!groups[label]) {
        groups[label] = [];
        order.push(label);
      }
      groups[label].push(m);
    });
    return order.map((label) => {
      const data = groups[label];
      const chunked = [];
      for (let i = 0; i < data.length; i += 3) {
        chunked.push(data.slice(i, i + 3));
      }
      return { title: label, data: chunked };
    });
  }, [imageMessages]);

  const groupedFiles = useMemo(() => {
    const groups: { [key: string]: ChatMessage[] } = {};
    const order: string[] = [];
    fileMessages.forEach((m) => {
      const d = new Date(m.createdAt);
      const label = `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
      if (!groups[label]) {
        groups[label] = [];
        order.push(label);
      }
      groups[label].push(m);
    });
    return order.map((label) => ({ title: label, data: groups[label] }));
  }, [fileMessages]);

  const groupedLinks = useMemo(() => {
    const groups: { [key: string]: ChatMessage[] } = {};
    const order: string[] = [];
    linkMessages.forEach((m) => {
      const d = new Date(m.createdAt);
      const label = `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
      if (!groups[label]) {
        groups[label] = [];
        order.push(label);
      }
      groups[label].push(m);
    });
    return order.map((label) => ({ title: label, data: groups[label] }));
  }, [linkMessages]);

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );

  const renderImageRow = ({ item: rowItems }: { item: ChatMessage[] }) => (
    <View style={{ flexDirection: 'row' }}>
      {rowItems.map((item) => {
        let uri = item.fileInfo?.url;
        if (uri && !uri.startsWith('http')) {
          uri = getAvatarUrl(uri) || uri;
        }
        const globalIndex = imageMessages.indexOf(item);
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.imageWrapper}
            onPress={() => {
              setSelectedIndex(globalIndex || 0);
              setViewerVisible(true);
            }}
          >
            <View style={{ flex: 1 }}>
              {item.type === 'video' ? (
                <VideoThumbnail uri={uri} style={styles.image} />
              ) : (
                <Image source={{ uri }} style={styles.image} resizeMode="cover" />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
      {rowItems.length < 3 &&
        Array(3 - rowItems.length)
          .fill(0)
          .map((_, i) => <View key={`empty-${i}`} style={styles.imageWrapper} />)}
    </View>
  );

  const renderFile = ({ item }: { item: ChatMessage }) => {
    const { fileInfo } = item;
    let uri = fileInfo?.url;
    if (uri && !uri.startsWith('http')) {
      uri = getAvatarUrl(uri) || uri;
    }
    const name = fileInfo?.name || 'File';
    return (
      <TouchableOpacity style={styles.fileRow} onPress={() => uri && Linking.openURL(uri).catch(() => {})}>
        <MaterialIcons name="insert-drive-file" size={24} color={colors.icon} />
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderLink = ({ item }: { item: ChatMessage }) => {
    const text = item.content as string;
    const match = text.match(/https?:\/\/\S+/);
    const url = match ? match[0] : text;
    return (
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => {
          Linking.openURL(url).catch(() => {});
        }}
      >
        <MaterialIcons name="link" size={20} color={colors.tint} />
        <Text style={[styles.linkText, { color: colors.tint }]} numberOfLines={1}>
          {url}
        </Text>
      </TouchableOpacity>
    );
  };

  const content = () => {
    switch (selectedTab) {
      case 'Ảnh':
        if (imageMessages.length === 0)
          return <Text style={{ color: colors.textSecondary, padding: 16 }}>Không có ảnh nào</Text>;
        return (
          <SectionList
            sections={groupedImages}
            keyExtractor={(item, index) => item[0]?.id || index.toString()}
            renderItem={renderImageRow}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ padding: 6 }}
            onEndReached={() => fetchAllMedia(true)}
            onEndReachedThreshold={0.5}
            stickySectionHeadersEnabled={false}
          />
        );
      case 'File':
        if (fileMessages.length === 0)
          return <Text style={{ color: colors.textSecondary, padding: 16 }}>Không có tệp nào</Text>;
        return (
          <SectionList
            sections={groupedFiles}
            keyExtractor={(m) => m.id}
            renderItem={renderFile}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ padding: 4 }}
            onEndReached={() => fetchAllMedia(true)}
            onEndReachedThreshold={0.5}
            stickySectionHeadersEnabled={false}
          />
        );
      case 'Link':
        if (linkMessages.length === 0)
          return <Text style={{ color: colors.textSecondary, padding: 16 }}>Không có link nào</Text>;
        return (
          <SectionList
            sections={groupedLinks}
            keyExtractor={(m) => m.id}
            renderItem={renderLink}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={{ padding: 4 }}
            onEndReached={() => fetchAllMedia(true)}
            onEndReachedThreshold={0.5}
            stickySectionHeadersEnabled={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Ảnh, file, link" showBack onBackPress={() => router.back()} />

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.surfaceVariant }}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              { flex: 1, paddingVertical: 12, alignItems: 'center' },
              selectedTab === tab && { borderBottomWidth: 2, borderBottomColor: colors.tint },
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={{ color: selectedTab === tab ? colors.tint : colors.textSecondary, fontWeight: '600' }}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {content()}
      <FullscreenImageViewer
        visible={viewerVisible}
        images={imageMessages.map(m => {
          let uri = m.fileInfo?.url || '';
          if (uri && !uri.startsWith('http')) {
            if (!uri.startsWith('/media') && !uri.startsWith('/storage')) {
              uri = `/media${uri.startsWith('/') ? '' : '/'}${uri}`;
            }
            uri = getAvatarUrl(uri) || uri;
          }
          return uri;
        })}
        initialIndex={selectedIndex}
        userInfo={
          imageMessages[selectedIndex]
            ? {
                name: imageMessages[selectedIndex].fromMe
                  ? 'Bạn'
                  : imageMessages[selectedIndex].contactName || 'Người dùng',
                avatarUrl: imageMessages[selectedIndex].fromMe
                  ? undefined
                  : imageMessages[selectedIndex].contactAvatar,
              }
            : undefined
        }
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageWrapper: {
    width: '33.333333%',
    aspectRatio: 1,
    padding: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  fileName: {
    marginLeft: 8,
    flex: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  linkText: {
    marginLeft: 6,
    flex: 1,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
