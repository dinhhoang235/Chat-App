import { API_URL } from '@/services/api';

export function getAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (typeof avatar !== 'string') return null;
  if (avatar.startsWith('http')) return avatar;
  // Ensure we don't duplicate slashes
  const prefix = API_URL?.endsWith('/') ? API_URL.slice(0, -1) : API_URL || '';
  const path = avatar.startsWith('/') ? avatar : `/${avatar}`;
  return `${prefix}${path}`;
}


export function getAvatarColor(name?: string): string {
  // Use a consistent brand blue as requested by the user
  return '#0084FF';
}

export default getAvatarUrl;
