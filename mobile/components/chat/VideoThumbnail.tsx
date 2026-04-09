import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

interface VideoThumbnailProps {
  uri: string;
  style: any;
}

const VideoThumbnail = ({ uri, style }: VideoThumbnailProps) => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Check if module exists to avoid crash on first load before rebuild
      if (!VideoThumbnails || !VideoThumbnails.getThumbnailAsync) {
        return;
      }
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
        setImage(thumbUri);
      } catch {
        // Fallback or silence
      }
    })();
  }, [uri]);

  return (
    <View style={[style, { backgroundColor: '#1C1C1E', overflow: 'hidden' }]}>
      {image ? (
        <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialIcons name="videocam" size={20} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }]}>
        <MaterialIcons name="play-circle-outline" size={24} color="#fff" />
      </View>
    </View>
  );
};

export default VideoThumbnail;
