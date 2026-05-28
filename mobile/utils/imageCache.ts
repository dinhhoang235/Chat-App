import * as FileSystem from "expo-file-system";
import * as LegacyFS from "expo-file-system/legacy";
import { downloadAsync as legacyDownloadAsync } from "expo-file-system/legacy";

const _fsAny = FileSystem as any;
const _legacyAny = LegacyFS as any;
const _baseDir =
  _fsAny.cacheDirectory ||
  _fsAny.documentDirectory ||
  _legacyAny.cacheDirectory ||
  _legacyAny.documentDirectory ||
  "";
if (!(_baseDir && _baseDir.length)) {
  try {
    console.warn(
      "[imageCache] WARNING: FileSystem cache/document directory is not available; downloads will be skipped.",
    );
  } catch {}
}
const CACHE_DIR = `${_baseDir}chat-images/`;
const CAN_WRITE_TO_DISK = Boolean(_baseDir && _baseDir.length);
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
      return;
    }

    // Fallback for older expo-file-system versions: use legacy API to avoid deprecated methods
    const legacyInfo = await LegacyFS.getInfoAsync(CACHE_DIR).catch(() => null);
    if (!legacyInfo || !legacyInfo.exists) {
      try {
        if ((LegacyFS as any).makeDirectoryAsync) {
          await (LegacyFS as any).makeDirectoryAsync(CACHE_DIR, {
            intermediates: true,
          });
        } else if ((LegacyFS as any).createDirectoryAsync) {
          await (LegacyFS as any).createDirectoryAsync(CACHE_DIR, {
            intermediates: true,
          });
        }
      } catch (e) {
        if (__DEV__) {
          try {
            console.warn(
              "[imageCache] ensureCacheDir: failed to create cache dir",
              { CACHE_DIR, error: e },
            );
          } catch {}
        }
      }
    }
    return;
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
  if (!CAN_WRITE_TO_DISK) {
    if (__DEV__) {
      try {
        console.warn(
          "[imageCache] downloadToCache skipped: no writable cache directory",
          { url },
        );
      } catch {}
    }
    return null;
  }
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
    const res = await legacyDownloadAsync(url, tmp).catch((e) => {
      if (__DEV__) {
        try {
          console.warn("[imageCache] legacyDownloadAsync failed", {
            url,
            error: e,
          });
        } catch {}
      }
      throw e;
    });
    if (res.status !== 200 && res.status !== 0) {
      if (__DEV__) {
        try {
          console.warn("[imageCache] downloadToCache non-200 status", {
            url,
            status: res.status,
            res,
          });
        } catch {}
      }
      try {
        await LegacyFS.deleteAsync(tmp);
      } catch {}
      return null;
    }
    try {
      if ((LegacyFS as any).moveAsync) {
        await (LegacyFS as any).moveAsync({ from: tmp, to: path });
      } else {
        await LegacyFS.copyAsync({ from: tmp, to: path });
        await LegacyFS.deleteAsync(tmp);
      }
    } catch {
      try {
        await LegacyFS.copyAsync({ from: tmp, to: path });
        await LegacyFS.deleteAsync(tmp);
      } catch {}
    }
    MEMORY_CACHE.set(url, path);
    try {
      // update on-disk index for faster warm-up later
      const idxRaw = await LegacyFS.readAsStringAsync(INDEX_FILE).catch(
        () => "{}",
      );
      let idx = {} as Record<string, string>;
      try {
        idx = JSON.parse(idxRaw || "{}");
      } catch {
        idx = {};
      }
      idx[url] = path;
      await LegacyFS.writeAsStringAsync(INDEX_FILE, JSON.stringify(idx)).catch(
        () => {},
      );
    } catch {}
    return path;
  } catch (e) {
    if (__DEV__) {
      try {
        console.warn("[imageCache] downloadToCache error", { url, error: e });
      } catch {}
    }
    return null;
  }
}

export async function warmMemoryCacheFromIndex(limit?: number) {
  try {
    await ensureCacheDir();
    const raw = await LegacyFS.readAsStringAsync(INDEX_FILE).catch(() => null);
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
