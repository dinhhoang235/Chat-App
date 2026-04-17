import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

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

export default InlineVideoPlayer;
