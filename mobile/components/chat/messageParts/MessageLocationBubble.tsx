import React, { useState } from 'react';
import { Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LocationData } from '@/constants/location';
import { getAvatarUrl } from '@/utils/avatar';

/**
 * Calculates OSM tile X/Y for a given lat/lng and zoom.
 */
function getOsmTileUrl(lat: number, lng: number, zoom = 16): string {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1.0 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2.0 * n);
  
  return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${x}/${y}.png`;
}

interface MessageLocationBubbleProps {
  content: string;
  textColor: string;
  colors: any;
  fromMe?: boolean;
  senderName?: string;
  avatar?: string;
  onLongPress?: () => void;
}

export default function MessageLocationBubble({
  content,
  textColor,
  colors,
  fromMe = false,
  senderName,
  avatar,
  onLongPress,
}: MessageLocationBubbleProps) {
  const [loading, setLoading] = useState(false);

  let locationData: LocationData | null = null;

  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      locationData = parsed;
    }
  } catch (err) {
    console.error('Error parsing location data:', err);
  }

  if (!locationData) {
    return (
      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ color: textColor, fontSize: 14 }}>Không thể hiển thị vị trí</Text>
      </View>
    );
  }

  const handleOpenMap = async () => {
    setLoading(true);
    try {
      const { latitude, longitude } = locationData!;
      const nativeUrl = Platform.select({
        ios: `maps://?q=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
        default: `https://maps.google.com?q=${latitude},${longitude}`,
      })!;

      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(`https://maps.google.com?q=${latitude},${longitude}`);
      }
    } catch (error) {
      console.error('Error opening map:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapUrl = locationData
    ? getOsmTileUrl(locationData.latitude, locationData.longitude)
    : null;

  return (
    <TouchableOpacity
      onPress={handleOpenMap}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      disabled={loading}
      style={{
        backgroundColor: fromMe ? (colors.bubbleMe || '#E3F2FD') : colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        width: 240,
        borderWidth: 1,
        borderColor: fromMe ? (colors.bubbleMeBorder || '#BBDEFB') : colors.border,
      }}
    >
      <View style={{ position: 'relative', width: 240, height: 140 }}>
        <Image
          source={{ uri: mapUrl || undefined, headers: { 'User-Agent': 'ChatAppMobile/1.0' } }}
          style={{ width: '100%', height: '100%', backgroundColor: colors.surfaceVariant }}
          contentFit="cover"
        />
        
        {/* Avatar Pin Overlay */}
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -22,
          marginTop: -44, // offset so the bottom tip points to the center
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Circular frame */}
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            zIndex: 2,
          }}>
            {avatar ? (
              <Image
                source={{ uri: getAvatarUrl(avatar) || undefined }}
                style={{ width: 38, height: 38, borderRadius: 19 }}
                contentFit="cover"
              />
            ) : (
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  {senderName ? senderName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
          {/* Pin triangle tail */}
          <View style={{
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 8,
            borderStyle: 'solid',
            backgroundColor: 'transparent',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: 'white',
            marginTop: -2,
            zIndex: 1,
          }} />
        </View>
      </View>
      
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
          Vị trí của {fromMe ? 'bạn' : (senderName || 'Người dùng')}
        </Text>
        {locationData.address && (
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {locationData.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
