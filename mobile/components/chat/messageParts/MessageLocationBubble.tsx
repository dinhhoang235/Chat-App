import React, { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LocationData, formatCoordinates } from '@/constants/location';

interface MessageLocationBubbleProps {
  content: string;
  textColor: string;
  colors: any;
  fromMe?: boolean;
}

export default function MessageLocationBubble({
  content,
  textColor,
  colors,
  fromMe = false,
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
        <Text style={{ color: textColor, fontSize: 14 }}>Khong the load vi tri</Text>
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

  const bubbleBg = fromMe ? '#E0E7FF' : '#F3E8FF';
  const iconColor = fromMe ? '#6366F1' : '#7C3AED';
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${locationData.latitude},${locationData.longitude}&zoom=15&size=300x150&markers=${locationData.latitude},${locationData.longitude}`;

  return (
    <TouchableOpacity
      onPress={handleOpenMap}
      activeOpacity={0.7}
      disabled={loading}
      style={{
        backgroundColor: bubbleBg,
        borderRadius: 12,
        overflow: 'hidden',
        width: 240,
      }}
    >
      <Image
        source={{ uri: mapUrl }}
        style={{ width: 240, height: 120, borderRadius: 12, backgroundColor: colors.surfaceVariant }}
        contentFit="cover"
      />
      <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="location-on" size={18} color={iconColor} style={{ marginRight: 6 }} />
          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: '600',
            }}
            numberOfLines={1}
          >
            {formatCoordinates(locationData.latitude, locationData.longitude)}
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <MaterialIcons name="open-in-new" size={16} color={iconColor} />
          )}
        </View>
        {locationData.address && (
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
            {locationData.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
