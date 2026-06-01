import React from "react";

export default function useViewability(params: any) {
  const {
    backgroundMediaWarmupEnabled,
    prefetchQueue,
    resolveMediaUri,
    visibleMessageIdSetRef,
  } = params;

  const onViewableItemsChanged = React.useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      visibleMessageIdSetRef.current = viewableItems || [];
      try {
        const nextVisibleIds = new Set<string>();
        for (const v of viewableItems || []) {
          const id = v?.item?.id;
          if (id == null) continue;
          nextVisibleIds.add(id.toString());
        }
        visibleMessageIdSetRef.current = nextVisibleIds;
      } catch {}
      if (!backgroundMediaWarmupEnabled) {
        return;
      }
      try {
        const now = Date.now();
        if (!(onViewableItemsChanged as any)._lastPrefetchAt)
          (onViewableItemsChanged as any)._lastPrefetchAt = 0;
        const last = (onViewableItemsChanged as any)._lastPrefetchAt as number;
        if (now - last < 800) return;
        (onViewableItemsChanged as any)._lastPrefetchAt = now;

        const toPrefetch: string[] = [];
        for (const v of viewableItems || []) {
          try {
            const item = v.item;
            if (!item) continue;
            if (item.type === "image" && item.fileInfo) {
              const thumb =
                item.fileInfo.thumbnailUrl ||
                item.fileInfo.thumbnail ||
                item.fileInfo.thumb ||
                item.fileInfo.url;
              if (thumb) toPrefetch.push(resolveMediaUri(thumb));
            } else if (
              item.type === "image_group" &&
              Array.isArray(item.images)
            ) {
              for (const img of item.images.slice(0, 6)) {
                const u =
                  img?.fileInfo?.thumbnailUrl ||
                  img?.fileInfo?.thumbnail ||
                  img?.fileInfo?.thumb ||
                  img?.fileInfo?.url;
                if (u) toPrefetch.push(resolveMediaUri(u));
              }
            }
          } catch {}
        }

        if (toPrefetch.length > 0) {
          const seen = new Set<string>();
          for (let i = 0; i < toPrefetch.length && i < 4; i++) {
            const uri = toPrefetch[i];
            if (!uri || seen.has(uri)) continue;
            seen.add(uri);
            setTimeout(() => {
              try {
                prefetchQueue.enqueue(uri).catch(() => {});
              } catch {}
            }, i * 150);
          }
        }
      } catch {}
    },
    [
      backgroundMediaWarmupEnabled,
      prefetchQueue,
      resolveMediaUri,
      visibleMessageIdSetRef,
    ],
  );

  return { onViewableItemsChanged };
}
