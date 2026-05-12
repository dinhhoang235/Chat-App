import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { LocationData, formatCoordinates, LOCATION_CONSTANTS } from '@/constants/location';
import { useLocation } from '@/hooks/useLocation';

interface LocationPreviewSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: LocationData) => void;
  initialLocation?: LocationData;
}

export default function LocationPreviewSheet({
  visible,
  onClose,
  onConfirm,
  initialLocation,
}: LocationPreviewSheetProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const { getCurrentLocation, loading, error, reverseGeocode } = useLocation();

  const [location, setLocation] = useState<LocationData | null>(initialLocation || null);
  const [address, setAddress] = useState<string>('');
  const [addressLoading, setAddressLoading] = useState(false);

  const snapPoints = useMemo(() => [350], []);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      if (!location && !initialLocation) {
        fetchLocation();
      }
    } else {
      sheetRef.current?.close();
    }
  }, [visible]); // Keep only visible

  useEffect(() => {
    if (location && !address && !addressLoading) {
      fetchAddress();
    }
  }, [location, address, addressLoading]);

  const fetchLocation = async () => {
    const result = await getCurrentLocation();
    if (result) {
      setLocation(result);
    }
  };

  const fetchAddress = async () => {
    if (!location) return;

    setAddressLoading(true);
    try {
      const result = await reverseGeocode(location.latitude, location.longitude);
      if (result) {
        setAddress(result);
      }
    } catch (err) {
      console.error('Error fetching address:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!location) {
      Alert.alert('Lỗi', 'Vui lòng đợi vị trí được tải');
      return;
    }
    onConfirm(location);
    onClose();
  };

  const handleRefresh = () => {
    setLocation(null);
    setAddress('');
    fetchLocation();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 }}>
          Chia sẻ vị trí
        </Text>

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              Đang lấy vị trí của bạn...
            </Text>
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <MaterialIcons name="error-outline" size={48} color="#EF4444" />
            <Text style={{ color: colors.text, marginTop: 12, fontSize: 14, fontWeight: '500' }}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={handleRefresh}
              style={{
                marginTop: 16,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: colors.tint,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : location ? (
          <View style={{ flex: 1 }}>
            {/* Location Card */}
            <View
              style={{
                backgroundColor: colors.surfaceVariant,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                <MaterialIcons name="place" size={24} color={colors.tint} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Tọa độ</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.text,
                      marginTop: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatCoordinates(location.latitude, location.longitude)}
                  </Text>
                </View>
              </View>

              {location.accuracy && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <MaterialIcons
                    name="my-location"
                    size={16}
                    color={
                      location.accuracy <= LOCATION_CONSTANTS.GOOD_ACCURACY
                        ? '#10B981'
                        : location.accuracy <= LOCATION_CONSTANTS.ACCEPTABLE_ACCURACY
                        ? '#F59E0B'
                        : '#EF4444'
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Độ chính xác: {Math.round(location.accuracy)}m
                  </Text>
                </View>
              )}

              {addressLoading ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Đang tải địa chỉ...</Text>
              ) : address ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <MaterialIcons name="location-on" size={16} color={colors.tint} style={{ marginRight: 8, marginTop: 2 }} />
                  <Text
                    style={{ fontSize: 12, color: colors.text, flex: 1, lineHeight: 18 }}
                    numberOfLines={2}
                  >
                    {address}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 'auto' }}>
              <TouchableOpacity
                onPress={handleRefresh}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border || colors.surfaceVariant,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cập nhật</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.tint,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Gửi vị trí</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
}
