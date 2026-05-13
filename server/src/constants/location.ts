export const LOCATION_BOUNDS = {
  LAT_MIN: -90,
  LAT_MAX: 90,
  LNG_MIN: -180,
  LNG_MAX: 180,
} as const;

export const LOCATION_ACCURACY = {
  MIN: 0,
  MAX: 1000, // 1000 meters - max acceptable accuracy
  GOOD: 50, // < 50m is considered good
} as const;

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string; // Optional, user-provided or reverse geocoded
  timestamp?: number;
}

export const isValidLocationData = (data: any): data is LocationData => {
  if (!data || typeof data !== 'object') return false;
  
  const { latitude, longitude } = data;
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  
  if (
    latitude < LOCATION_BOUNDS.LAT_MIN ||
    latitude > LOCATION_BOUNDS.LAT_MAX ||
    longitude < LOCATION_BOUNDS.LNG_MIN ||
    longitude > LOCATION_BOUNDS.LNG_MAX
  ) {
    return false;
  }
  
  if (data.accuracy !== undefined && typeof data.accuracy !== 'number') {
    return false;
  }
  
  return true;
};
