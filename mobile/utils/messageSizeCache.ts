const MESSAGE_SIZE_CACHE = new Map<string | number, number>();

export function setMessageSize(
  id: string | number | null | undefined,
  size: number,
) {
  if (id == null) return;
  try {
    MESSAGE_SIZE_CACHE.set(id, Math.round(size));
  } catch {
    // ignore
  }
}

export function getMessageSize(id: string | number | null | undefined) {
  if (id == null) return undefined;
  return MESSAGE_SIZE_CACHE.get(id as string | number);
}

export default MESSAGE_SIZE_CACHE;
