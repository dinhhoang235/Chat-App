import { useState, useCallback } from 'react';
import { locationService } from '@/services/locationService';
import { LocationData, isValidLocationData } from '@/constants/location';

interface UseLocationState {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
}

export const useLocation = () => {
  const [state, setState] = useState<UseLocationState>({
    location: null,
    loading: false,
    error: null,
  });

  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const location = await locationService.getCurrentPosition();

      if (location && isValidLocationData(location)) {
        setState((prev) => ({
          ...prev,
          location,
          loading: false,
          error: null,
        }));
        return location;
      } else {
        throw new Error('Invalid location data received');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return null;
    }
  }, []);

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number): Promise<string | null> => {
      try {
        return await locationService.reverseGeocode(latitude, longitude);
      } catch (err) {
        console.error('Reverse geocode error:', err);
        return null;
      }
    },
    []
  );

  const geocode = useCallback(async (address: string): Promise<LocationData | null> => {
    try {
      return await locationService.geocode(address);
    } catch (err) {
      console.error('Geocode error:', err);
      return null;
    }
  }, []);

  const clearLocation = useCallback(() => {
    setState({
      location: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    getCurrentLocation,
    reverseGeocode,
    geocode,
    clearLocation,
  };
};
