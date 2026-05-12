import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { LOCATION_CONSTANTS, LocationData } from '@/constants/location';

class LocationServiceClass {
  private isRequesting = false;

  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  async getCurrentPosition(): Promise<LocationData | null> {
    if (this.isRequesting) {
      console.warn('Location request already in progress');
      return null;
    }

    try {
      this.isRequesting = true;

      // Check permission first
      let hasPermission = await this.checkPermission();
      if (!hasPermission) {
        hasPermission = await this.requestPermission();
      }

      if (!hasPermission) {
        Alert.alert(
          'Không có quyền truy cập vị trí',
          'Vui lòng cấp quyền truy cập vị trí trong cài đặt để chia sẻ vị trí.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!location) {
        throw new Error('Failed to get location');
      }

      const { latitude, longitude, accuracy } = location.coords;

      // Warn if accuracy is poor
      if (accuracy && accuracy > LOCATION_CONSTANTS.ACCEPTABLE_ACCURACY) {
        console.warn(`Location accuracy is ${accuracy}m, which may not be very precise`);
      }

      const locationData: LocationData = {
        latitude,
        longitude,
        accuracy: accuracy || undefined,
        timestamp: location.timestamp,
      };

      return locationData;
    } catch (error: any) {
      console.error('Get location error:', error);
      
      if (error?.code) {
        if (error.code === 'E_LOCATION_UNAVAILABLE') {
          Alert.alert(
            'Vị trí không khả dụng',
            'GPS không khả dụng trên thiết bị này. Vui lòng kiểm tra cài đặt.'
          );
        } else if (error.code === 'E_PERMISSION_DENIED') {
          Alert.alert(
            'Quyền truy cập bị từ chối',
            'Vui lòng cấp quyền truy cập vị trí trong cài đặt.'
          );
        } else {
          Alert.alert('Lỗi', `Không thể lấy vị trí: ${error.message}`);
        }
      }
      
      return null;
    } finally {
      this.isRequesting = false;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results.length > 0) {
        const address = results[0];
        const parts = [];
        
        if (address.name) parts.push(address.name);
        if (address.street) parts.push(address.street);
        if (address.city) parts.push(address.city);
        if (address.region) parts.push(address.region);

        return parts.join(', ') || null;
      }

      return null;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  }

  async geocode(address: string): Promise<LocationData | null> {
    try {
      const results = await Location.geocodeAsync(address);

      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        return {
          latitude,
          longitude,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error('Geocode error:', error);
      return null;
    }
  }
}

export const locationService = new LocationServiceClass();
