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

      // Check if location services are enabled (optional, some devices report false wrongly)
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          console.warn('Location services are reported as disabled');
        }
      } catch (e) {
        console.warn('Failed to check location services status', e);
      }

      // Get current location with fallback strategies
      let location;
      try {
        // Strategy 1: Balanced accuracy
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (err) {
        console.warn('Balanced accuracy failed, trying Low accuracy...', err);
        try {
          // Strategy 2: Low accuracy (faster, works better indoors/emulators)
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Lowest,
          });
        } catch (err2) {
          console.warn('Low accuracy failed, trying getLastKnownPositionAsync...', err2);
          // Strategy 3: Last known position
          location = await Location.getLastKnownPositionAsync();
        }
      }

      // If all fails, provide a default location (e.g., Ho Chi Minh City)
      // so the user can at least see the map and pick a location manually.
      if (!location) {
        console.warn('All location strategies failed, using default location.');
        location = {
          coords: {
            latitude: 10.762622,
            longitude: 106.660172,
            accuracy: 1000,
            altitude: 0,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        } as Location.LocationObject;
        
        // Don't throw error here, return the default location
        // throw new Error('Vị trí hiện tại không khả dụng. Vui lòng bật dịch vụ định vị.');
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
      // Use Nominatim (OpenStreetMap) for reverse geocoding to bypass native Android geocoder timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            'User-Agent': 'ChatAppMobile/1.0',
            'Accept-Language': 'vi', // request Vietnamese address
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        const parts = [];
        
        // Assemble address components
        if (addr.house_number || addr.road) {
          parts.push([addr.house_number, addr.road].filter(Boolean).join(' '));
        }
        if (addr.suburb || addr.quarter || addr.neighbourhood) {
          parts.push(addr.suburb || addr.quarter || addr.neighbourhood);
        }
        if (addr.city || addr.town || addr.village || addr.county) {
          parts.push(addr.city || addr.town || addr.village || addr.county);
        }
        if (addr.state || addr.region) {
          parts.push(addr.state || addr.region);
        }

        const formatted = parts.filter(Boolean).join(', ');
        return formatted || data.display_name || null;
      }

      return null;
    } catch (error) {
      console.error('Nominatim reverse geocode error:', error);
      
      // Fallback to Expo's native if OSM fails (which might timeout but worth a try)
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results.length > 0) {
          const address = results[0];
          const parts = [];
          if (address.name) parts.push(address.name);
          if (address.street) parts.push(address.street);
          if (address.city) parts.push(address.city);
          if (address.region) parts.push(address.region);
          return parts.join(', ') || null;
        }
      } catch (nativeError) {
        console.error('Native reverse geocode error:', nativeError);
      }
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
