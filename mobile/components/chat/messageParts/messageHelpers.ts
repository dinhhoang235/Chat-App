import { getAvatarUrl } from "@/utils/avatar";

export const resolveMediaUri = (url: string) => {
  if (
    url.startsWith("http") ||
    url.startsWith("file://") ||
    url.startsWith("content://")
  ) {
    return url;
  }
  return getAvatarUrl(url) || url;
};
