export const LOCATION_CONSTANTS = {
  // GPS accuracy constants (in meters)
  GOOD_ACCURACY: 50,
  ACCEPTABLE_ACCURACY: 100,
  MAX_ACCEPTABLE_ACCURACY: 1000,

  // Timeout for getting position (in milliseconds)
  GET_POSITION_TIMEOUT: 10000, // 10 seconds

  // Default timeout for permissions request
  PERMISSIONS_TIMEOUT: 5000,

  // Map constants
  DEFAULT_ZOOM: 15,
  MIN_ZOOM: 5,
  MAX_ZOOM: 19,

  // URL schemes for maps
  GOOGLE_MAPS_SCHEME: 'comgooglemaps://',
  APPLE_MAPS_SCHEME: 'maps://',
  GOOGLE_MAPS_WEB: 'https://maps.google.com',
} as const;

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp?: number;
}

export const isValidLocationData = (data: any): data is LocationData => {
  if (!data || typeof data !== 'object') return false;
  
  const { latitude, longitude } = data;
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }

  // Validate bounds
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return false;
  }

  if (data.accuracy !== undefined && typeof data.accuracy !== 'number') {
    return false;
  }

  return true;
};

export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

export const getLocationUrl = (latitude: number, longitude: number, label?: string): string => {
  const q = label ? `${label} (${latitude},${longitude})` : `${latitude},${longitude}`;
  return `${LOCATION_CONSTANTS.GOOGLE_MAPS_WEB}?q=${encodeURIComponent(q)}`;
};

export const getMapThumbnailUrl = (latitude: number, longitude: number, zoom: number = LOCATION_CONSTANTS.DEFAULT_ZOOM, size: string = '400x300'): string => {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=${zoom}&size=${size}&markers=color:red%7C${latitude},${longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`;
};

export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
