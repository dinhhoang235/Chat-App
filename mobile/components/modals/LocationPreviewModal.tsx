import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { LocationData, formatCoordinates, LOCATION_CONSTANTS } from '@/constants/location';
import { useLocation } from '@/hooks/useLocation';
import { WebView } from 'react-native-webview';

interface LocationPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (latitude: number, longitude: number) => void;
  initialLocation?: LocationData;
}

export default function LocationPreviewModal({
  visible,
  onClose,
  onConfirm,
  initialLocation,
}: LocationPreviewModalProps) {
  const { colors } = useTheme();
  const webviewRef = useRef<WebView>(null);
  const { getCurrentLocation, loading, error, reverseGeocode } = useLocation();

  const [deviceLocation, setDeviceLocation] = useState<LocationData | null>(initialLocation || null);
  const [address, setAddress] = useState<string>('');
  const [addressLoading, setAddressLoading] = useState(false);

  const fetchLocation = useCallback(async () => {
    const result = await getCurrentLocation();
    if (result) {
      setDeviceLocation(result);
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          if (window.map) {
            window.map.flyTo([${result.latitude}, ${result.longitude}], 16, {
              animate: true,
              duration: 1.5
            });
          }
          true;
        `);
      }
    }
  }, [getCurrentLocation]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAddressForLocation = useCallback(async (lat: number, lng: number) => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setAddressLoading(true);
    
    // Set a new debounce timer
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await reverseGeocode(lat, lng);
        if (result) {
          setAddress(result);
        } else {
          setAddress('');
        }
      } catch (err) {
        console.error('Error fetching address:', err);
      } finally {
        setAddressLoading(false);
      }
    }, 1000); // 1 second debounce to comply with Nominatim policy
  }, [reverseGeocode]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (visible && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      if (!deviceLocation && !initialLocation) {
        fetchLocation();
      }
    }
    if (!visible) {
      hasFetchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]); 

  useEffect(() => {
    if (deviceLocation && !address && !addressLoading && !debounceTimerRef.current) {
      fetchAddressForLocation(deviceLocation.latitude, deviceLocation.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceLocation, fetchAddressForLocation]);

  const handleConfirm = () => {
    if (!deviceLocation) {
      Alert.alert('Lỗi', 'Vui lòng đợi vị trí được tải');
      return;
    }
    onConfirm(deviceLocation.latitude, deviceLocation.longitude);
    onClose();
  };

  const handleRecenter = () => {
    if (deviceLocation && webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        if (window.map) {
          window.map.flyTo([${deviceLocation.latitude}, ${deviceLocation.longitude}], 16, {
            animate: true,
            duration: 1.5
          });
          if (window.userMarker) {
            window.userMarker.setLatLng([${deviceLocation.latitude}, ${deviceLocation.longitude}]);
          }
        }
        true;
      `);
    }
    fetchLocation();
  };

  const handleZoomIn = () => {
    webviewRef.current?.injectJavaScript(`
      if (window.map) {
        window.map.zoomIn();
      }
      true;
    `);
  };

  const handleZoomOut = () => {
    webviewRef.current?.injectJavaScript(`
      if (window.map) {
        window.map.zoomOut();
      }
      true;
    `);
  };

  const handleMessage = (event: any) => {
    try {
      // No longer updating location based on moveEnd as we only share device location
      // event.nativeEvent.data is parsed if needed for other message types
    } catch (e) {
      console.error('Error parsing webview message:', e);
    }
  };

  const mapHtml = useMemo(() => {
    if (!deviceLocation) return '';
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
              body, html { margin: 0; padding: 0; height: 100%; width: 100%; background-color: #f0f0f0; }
              #map { height: 100%; width: 100%; }
              .leaflet-control-attribution { display: none !important; }
              .user-location-dot {
                  width: 12px;
                  height: 12px;
                  background-color: #3b82f6;
                  border: 2px solid white;
                  border-radius: 50%;
                  box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
              }
              .user-location-pulse {
                  position: absolute;
                  width: 20px;
                  height: 20px;
                  background-color: rgba(59, 130, 246, 0.2);
                  border-radius: 50%;
                  transform: translate(-4px, -4px);
                  animation: pulse 2s infinite;
              }
              @keyframes pulse {
                  0% { transform: translate(-4px, -4px) scale(0.5); opacity: 0.8; }
                  70% { transform: translate(-4px, -4px) scale(2.5); opacity: 0; }
                  100% { transform: translate(-4px, -4px) scale(0.5); opacity: 0; }
              }
          </style>
      </head>
      <body>
          <div id="map"></div>
          <script>
              const lat = ${deviceLocation.latitude};
              const lng = ${deviceLocation.longitude};
              window.map = L.map('map', { 
                  zoomControl: false,
                  zoomAnimation: true,
                  fadeAnimation: true,
                  markerZoomAnimation: true
              }).setView([lat, lng], 16);
              
              L.tileLayer('https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
                  maxZoom: 19,
                  attribution: '&copy; <a href="https://carto.com/">Carto</a>'
              }).addTo(window.map);

              // Add user location blue dot marker
              const userIcon = L.divIcon({
                  className: 'user-location-wrapper',
                  html: '<div class="user-location-pulse"></div><div class="user-location-dot"></div>',
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
              });
              window.userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(window.map);
          </script>
      </body>
      </html>
    `;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceLocation?.latitude === undefined]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Chia sẻ vị trí</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1 }}>
          {loading && !deviceLocation ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Đang lấy vị trí của bạn...
              </Text>
            </View>
          ) : error && !deviceLocation ? (
            <View style={styles.centered}>
              <MaterialIcons name="location-off" size={52} color="#EF4444" />
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
              <TouchableOpacity
                onPress={handleRecenter}
                style={[styles.retryBtn, { backgroundColor: colors.tint }]}
              >
                <MaterialIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : deviceLocation ? (
            <View style={{ flex: 1, position: 'relative' }}>
              {/* Interactive Map */}
              <View style={{ flex: 1 }}>
                <WebView
                  ref={webviewRef}
                  style={{ flex: 1, backgroundColor: 'transparent' }}
                  originWhitelist={['*']}
                  source={{ html: mapHtml, baseUrl: 'https://openstreetmap.org' }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onMessage={handleMessage}
                  scrollEnabled={false}
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                />
                                {/* Zoom Controls */}
                <View style={[styles.zoomControls, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    onPress={handleZoomIn}
                    activeOpacity={0.6}
                    style={[styles.zoomBtn, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  >
                    <MaterialIcons name="add" size={22} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleZoomOut}
                    activeOpacity={0.6}
                    style={styles.zoomBtn}
                  >
                    <MaterialIcons name="remove" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Nút Recenter */}
                <TouchableOpacity
                  onPress={handleRecenter}
                  style={[styles.recenterBtn, { backgroundColor: '#10B981', shadowColor: '#000' }]}
                >
                  <MaterialIcons name="my-location" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Info Card (nổi trên bản đồ) */}
              <View style={[styles.infoCardWrapper]}>
                <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                  {/* Address */}
                  <View style={styles.infoRow}>
                    <MaterialIcons name="location-on" size={20} color={colors.tint} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      {addressLoading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ActivityIndicator size="small" color={colors.tint} />
                          <Text style={[styles.addressLoading, { color: colors.textSecondary }]}>
                            Đang tải địa chỉ...
                          </Text>
                        </View>
                      ) : address ? (
                        <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
                          {address}
                        </Text>
                      ) : (
                        <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                          {formatCoordinates(deviceLocation.latitude, deviceLocation.longitude)}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Accuracy */}
                  {deviceLocation.accuracy != null && !addressLoading && (
                    <View style={[styles.infoRow, { marginTop: 10 }]}>
                      <MaterialIcons name="my-location" size={16} color={
                        deviceLocation.accuracy <= LOCATION_CONSTANTS.GOOD_ACCURACY
                          ? '#10B981'
                          : deviceLocation.accuracy <= LOCATION_CONSTANTS.ACCEPTABLE_ACCURACY
                          ? '#F59E0B'
                          : '#EF4444'
                      } />
                      <Text style={[styles.accuracyText, { color: colors.textSecondary, marginLeft: 10 }]}>
                        Độ chính xác: {Math.round(deviceLocation.accuracy)}m
                      </Text>
                    </View>
                  )}

                  {/* Send Button */}
                  <TouchableOpacity
                    onPress={handleConfirm}
                    style={[styles.primaryBtn, { backgroundColor: colors.tint, marginTop: 16 }]}
                  >
                    <MaterialIcons name="send" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Gửi vị trí này</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
   zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    width: 40,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  zoomBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardWrapper: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressLoading: {
    marginLeft: 8,
    fontSize: 14,
  },
  addressText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  accuracyText: {
    fontSize: 13,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
