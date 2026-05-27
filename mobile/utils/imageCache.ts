import * as FileSystem from "expo-file-system";
import { downloadAsync as legacyDownloadAsync } from "expo-file-system/legacy";

const CACHE_DIR = `${(FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory}chat-images/`;

async function ensureCacheDir() {
  try {
    // prefer new Directory API
    if (FileSystem.Directory && FileSystem.Directory.getInfoAsync) {
      const info = await FileSystem.Directory.getInfoAsync(CACHE_DIR);
      if (!info.exists) {
        await FileSystem.Directory.createDirectoryAsync(CACHE_DIR, {
          intermediates: true,
        });
      }
    }
  } catch {
    // ignore
  }
}

function filenameForUrl(url: string) {
  const safe = encodeURIComponent(url).replace(/[.%]/g, "_");
  return safe.slice(0, 200);
}

export async function getCachedPath(url?: string | null) {
  if (!url) return null;
  try {
    await ensureCacheDir();
    const name = filenameForUrl(url);
    const path = CACHE_DIR + name;
    let info: any = null;
    if (FileSystem.File && FileSystem.File.getInfoAsync) {
      info = await FileSystem.File.getInfoAsync(path);
      if (info && info.exists && info.size && info.size > 0) return path;
    }
    return null;
  } catch {
    return null;
  }
}

export async function downloadToCache(url?: string | null) {
  if (!url) return null;
  try {
    await ensureCacheDir();
    const name = filenameForUrl(url);
    const path = CACHE_DIR + name;
    let info: any = null;
    if (FileSystem.File && FileSystem.File.getInfoAsync) {
      info = await FileSystem.File.getInfoAsync(path);
      if (info && info.exists && info.size && info.size > 0) return path;
    }

    const tmp = path + ".tmp";
    const res = await legacyDownloadAsync(url, tmp);
    if (res.status !== 200 && res.status !== 0) {
      try {
        await FileSystem.deleteAsync(tmp);
      } catch {}
      return null;
    }
    try {
      if (FileSystem.File && FileSystem.File.moveAsync) {
        await FileSystem.File.moveAsync({ from: tmp, to: path });
      } else if (FileSystem.moveAsync) {
        await FileSystem.moveAsync({ from: tmp, to: path });
      } else {
        await FileSystem.copyAsync({ from: tmp, to: path });
        await FileSystem.deleteAsync(tmp);
      }
    } catch {
      try {
        await FileSystem.copyAsync({ from: tmp, to: path });
        await FileSystem.deleteAsync(tmp);
      } catch {}
    }
    return path;
  } catch {
    return null;
  }
}

export async function clearCache() {
  try {
    if (FileSystem.Directory && FileSystem.Directory.getInfoAsync) {
      const info = await FileSystem.Directory.getInfoAsync(CACHE_DIR);
      if (info.exists)
        await FileSystem.Directory.deleteAsync(CACHE_DIR, { idempotent: true });
    }
  } catch {}
}

export default { getCachedPath, downloadToCache, clearCache };
