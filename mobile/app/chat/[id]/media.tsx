import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Linking, StyleSheet } from 'react-native';
import { useTheme } from '@/context/themeContext';
import { Header, FullscreenImageViewer } from '@/components';
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
  const { messages, fetchMessages } = useChatThread();
  const [selectedTab, setSelectedTab] = useState<string>(TABS[0]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    // fetch initial messages for previews
    fetchMessages(false);
  }, [fetchMessages]);

  // derive filtered lists
  const imageMessages = messages.filter(m => m.type === 'image' && m.fileInfo?.url);
  const fileMessages = messages.filter(m => m.type === 'file' && m.fileInfo?.url);
  const linkMessages = messages.filter(
    m =>
      m.type === 'text' &&
      typeof m.content === 'string' &&
      /(https?:\/\/\S+)/.test(m.content),
  );

  const renderImage = ({ item, index }: { item: ChatMessage; index: number }) => {
    let uri = item.fileInfo?.url;
    if (uri && !uri.startsWith('http')) {
      if (!uri.startsWith('/media')) uri = `/media${uri}`;
      uri = getAvatarUrl(uri) || uri;
    }
    return (
      <TouchableOpacity
        style={styles.imageWrapper}
        onPress={() => {
          setSelectedIndex(index || 0);
          setViewerVisible(true);
        }}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderFile = ({ item }: { item: ChatMessage }) => {
    const { fileInfo } = item;
    let uri = fileInfo?.url;
    if (uri && !uri.startsWith('http')) {
      if (!uri.startsWith('/media')) uri = `/media${uri}`;
      uri = getAvatarUrl(uri) || uri;
    }
    const name = fileInfo?.name || 'File';
    return (
      <TouchableOpacity style={styles.fileRow} onPress={() => uri && Linking.openURL(uri).catch(() => {})}>
        <MaterialIcons name="insert-drive-file" size={24} color={colors.icon} />
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
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
        <Text style={[styles.linkText, { color: colors.tint }]} numberOfLines={1}>{url}</Text>
      </TouchableOpacity>
    );
  };

  const content = () => {
    switch (selectedTab) {
      case 'Ảnh':
        if (imageMessages.length === 0) return <Text style={{ color: colors.textSecondary, padding: 16 }}>Không có ảnh nào</Text>;
        return (
          <FlatList
            key={`images-${imageMessages.length}-cols-3`}
            data={imageMessages}
            keyExtractor={m => m.id}
            numColumns={3}
            renderItem={renderImage}
            contentContainerStyle={{ padding: 6 }}
            onEndReached={() => fetchMessages(true)}
            onEndReachedThreshold={0.5}
          />
        );
      case 'File':
        if (fileMessages.length === 0) return <Text style={{ color: colors.textSecondary, padding: 16 }}>Không có tệp nào</Text>;
        return (
          <FlatList
            key={`files-${fileMessages.length}`}
            data={fileMessages}
            keyExtractor={m => m.id}
            renderItem={renderFile}
            contentContainerStyle={{ padding: 4 }}
            onEndReached={() => fetchMessages(true)}
            onEndReachedThreshold={0.5}
          />
        );
      case 'Link':
        if (linkMessages.length === 0) return <Text style={{ color: colors.textSecondary, padding: 16 }}>Không có link nào</Text>;
        return (
          <FlatList
            key={`links-${linkMessages.length}`}
            data={linkMessages}
            keyExtractor={m => m.id}
            renderItem={renderLink}
            contentContainerStyle={{ padding: 4 }}
            onEndReached={() => fetchMessages(true)}
            onEndReachedThreshold={0.5}
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
            if (!uri.startsWith('/media')) uri = `/media${uri}`;
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
});
