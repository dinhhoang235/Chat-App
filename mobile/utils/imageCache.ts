import * as FileSystem from "expo-file-system";
import { downloadAsync as legacyDownloadAsync } from "expo-file-system/legacy";

const CACHE_DIR = `${(FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory}chat-images/`;
const INDEX_FILE = `${CACHE_DIR}index.json`;
const MEMORY_CACHE = new Map<string, string>();

export function peekCachedPath(url?: string | null) {
  if (!url) return null;
  return MEMORY_CACHE.get(url) || null;
}

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
    const memoryHit = MEMORY_CACHE.get(url);
    if (memoryHit) return memoryHit;

    await ensureCacheDir();
    const name = filenameForUrl(url);
    const path = CACHE_DIR + name;
    let info: any = null;
    if (FileSystem.File && FileSystem.File.getInfoAsync) {
      info = await FileSystem.File.getInfoAsync(path);
      if (info && info.exists && info.size && info.size > 0) {
        MEMORY_CACHE.set(url, path);
        return path;
      }
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
    MEMORY_CACHE.set(url, path);
    try {
      // update on-disk index for faster warm-up later
      const idxRaw = await FileSystem.readAsStringAsync(INDEX_FILE).catch(
        () => "{}",
      );
      let idx = {} as Record<string, string>;
      try {
        idx = JSON.parse(idxRaw || "{}");
      } catch {
        idx = {};
      }
      idx[url] = path;
      await FileSystem.writeAsStringAsync(
        INDEX_FILE,
        JSON.stringify(idx),
      ).catch(() => {});
    } catch {}
    return path;
  } catch {
    return null;
  }
}

export async function warmMemoryCacheFromIndex(limit?: number) {
  try {
    await ensureCacheDir();
    const raw = await FileSystem.readAsStringAsync(INDEX_FILE).catch(
      () => null,
    );
    if (!raw) return 0;
    let idx: Record<string, string> = {};
    try {
      idx = JSON.parse(raw);
    } catch {
      return 0;
    }
    const entries = Object.entries(idx).slice(
      0,
      limit || Object.keys(idx).length,
    );
    let warmed = 0;
    for (const [url, path] of entries) {
      try {
        if (!url || !path) continue;
        if (MEMORY_CACHE.has(url)) {
          warmed++;
          continue;
        }
        let info: any = null;
        if (FileSystem.File && FileSystem.File.getInfoAsync) {
          info = await FileSystem.File.getInfoAsync(path).catch(() => null);
        }
        if (info && info.exists && info.size && info.size > 0) {
          MEMORY_CACHE.set(url, path);
          warmed++;
        }
      } catch {}
    }
    return warmed;
  } catch {
    return 0;
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

export default {
  getCachedPath,
  downloadToCache,
  clearCache,
  warmMemoryCacheFromIndex,
};
