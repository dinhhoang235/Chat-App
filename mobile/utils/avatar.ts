import { API_URL } from "@/services/api";

export function getAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (typeof avatar !== "string") return null;
  if (avatar.startsWith("http") || avatar.startsWith("file://")) return avatar;
  // Ensure we don't duplicate slashes
  const prefix = API_URL?.endsWith("/") ? API_URL.slice(0, -1) : API_URL || "";
  const path = avatar.startsWith("/") ? avatar : `/${avatar}`;
  return `${prefix}${path}`;
}

export function getAvatarColor(name?: string): string {
  // Use a consistent brand blue as requested by the user
  return "#0084FF";
}

export function getDefaultAvatarUrl(): string {
  // Allow overriding via EXPO public env var, otherwise use server path
  const defaultPath =
    process.env.EXPO_PUBLIC_DEFAULT_AVATAR ||
    "/storage/chatapp/default_avatar.png";
  return getAvatarUrl(defaultPath) || defaultPath;
}

export default getAvatarUrl;
