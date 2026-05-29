import * as FileSystem from "expo-file-system";
import * as LegacyFS from "expo-file-system/legacy";

const _fsAny = FileSystem as any;
const _legacyAny = LegacyFS as any;
const _baseDir =
  _fsAny.cacheDirectory ||
  _fsAny.documentDirectory ||
  _legacyAny.cacheDirectory ||
  _legacyAny.documentDirectory ||
  "";
const DIR = `${_baseDir}group_composites/`;

const hashKey = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const ensureDir = async () => {
  try {
    const info = await LegacyFS.getInfoAsync(DIR).catch(() => null);
    if (!info || !info.exists) {
      await LegacyFS.makeDirectoryAsync(DIR, { intermediates: true }).catch(
        () => {},
      );
    }
  } catch {
    // ignore
  }
};

const urlToFilename = (url: string, key: string) => {
  const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = extMatch ? extMatch[1] : "webp";
  return `${key}.${ext}`;
};

export const getParticipantsKey = (
  conversationId: string | number,
  participantsHash?: string,
) => {
  if (participantsHash) return `${conversationId}_${participantsHash}`;
  return `${conversationId}`;
};

export const getLocalCompositePath = async (
  conversationId: string | number,
  compositeUrl?: string,
  participantsHash?: string,
): Promise<string | null> => {
  if (!compositeUrl) return null;
  await ensureDir();
  const key = hashKey(getParticipantsKey(conversationId, participantsHash));
  const filename = urlToFilename(compositeUrl, key);
  const path = DIR + filename;
  const info = await LegacyFS.getInfoAsync(path).catch(() => null);
  if (info.exists) return path;
  return null;
};

export const prefetchComposite = async (
  conversationId: string | number,
  compositeUrl?: string,
  participantsHash?: string,
): Promise<string | null> => {
  if (!compositeUrl) return null;
  await ensureDir();
  const key = hashKey(getParticipantsKey(conversationId, participantsHash));
  const filename = urlToFilename(compositeUrl, key);
  const path = DIR + filename;

  try {
    const info = await LegacyFS.getInfoAsync(path).catch(() => null);
    if (info && info.exists) return path;

    // Download to cache
    const tmp = path + ".tmp";
    const res = await LegacyFS.downloadAsync(compositeUrl, tmp);
    if (res.status !== 200 && res.status !== 201) {
      // fallback: remove tmp
      await FileSystem.deleteAsync(tmp).catch(() => {});
      return null;
    }
    // Move tmp -> final
    await FileSystem.moveAsync({ from: res.uri, to: path });
    return path;
  } catch (err) {
    console.warn("prefetchComposite failed", err);
    return null;
  }
};

export const removeComposite = async (
  conversationId: string | number,
  participantsHash?: string,
) => {
  await ensureDir();
  const key = hashKey(getParticipantsKey(conversationId, participantsHash));
  // delete any file starting with key
  try {
    const listing = await LegacyFS.readDirectoryAsync(DIR);
    for (const f of listing) {
      if (f.startsWith(key)) {
        await LegacyFS.deleteAsync(DIR + f).catch(() => {});
      }
    }
  } catch {
    // ignore
  }
};

export default {
  getLocalCompositePath,
  prefetchComposite,
  removeComposite,
};
