import React from "react";

export default function useMediaPrefetch(params: any) {
  const {
    backgroundMediaWarmupEnabled,
    processedMessages,
    conversationId,
    thumbnailPrefetchRunRef,
    mediaPrefetchRunRef,
    scheduleLowPriorityTask,
    getCachedPath,
    prefetchQueue,
    resolveMediaUri,
    prefetchTimeoutsRef,
  } = params;

  React.useEffect(() => {
    if (!backgroundMediaWarmupEnabled) {
      return;
    }
    if (!processedMessages || processedMessages.length === 0) {
      return;
    }
    if (thumbnailPrefetchRunRef.current === conversationId) {
      return;
    }
    thumbnailPrefetchRunRef.current = conversationId;
    let cancelled = false;

    const cancelSchedule = scheduleLowPriorityTask(() => {
      void (async () => {
        try {
          const toPrefetch: string[] = [];
          for (const item of processedMessages) {
            try {
              if (item.type === "image" && item.fileInfo) {
                const thumb =
                  item.fileInfo.thumbnailUrl ||
                  item.fileInfo.thumbnail ||
                  item.fileInfo.thumb ||
                  item.fileInfo.url;
                if (thumb) toPrefetch.push(resolveMediaUri(thumb));
              }
            } catch {}
            if (toPrefetch.length >= 4) break;
          }

          if (cancelled || toPrefetch.length === 0) {
            return;
          }

          const diskPromises = toPrefetch.map((u) =>
            getCachedPath(u).catch(() => null),
          );

          for (const u of toPrefetch) {
            try {
              prefetchQueue.enqueue(u).catch(() => {});
            } catch {}
          }

          await Promise.race([
            Promise.all(diskPromises),
            new Promise((res) => setTimeout(res, 80)),
          ]);
        } catch {
          // ignore
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [
    backgroundMediaWarmupEnabled,
    conversationId,
    processedMessages,
    scheduleLowPriorityTask,
    thumbnailPrefetchRunRef,
    getCachedPath,
    prefetchQueue,
    resolveMediaUri,
  ]);

  React.useEffect(() => {
    if (!backgroundMediaWarmupEnabled) return;
    let mounted = true;
    const cancel = scheduleLowPriorityTask(() => {
      void (async () => {
        if (!processedMessages || processedMessages.length === 0) return;
        if (mediaPrefetchRunRef.current === conversationId) return;
        mediaPrefetchRunRef.current = conversationId;
        const toPrefetch: string[] = [];

        for (const item of processedMessages) {
          try {
            if (item.type === "image" && item.fileInfo) {
              const thumb =
                item.fileInfo.thumbnailUrl ||
                item.fileInfo.thumbnail ||
                item.fileInfo.thumb;
              if (thumb) toPrefetch.push(resolveMediaUri(thumb));
              else if (item.fileInfo.url)
                toPrefetch.push(resolveMediaUri(item.fileInfo.url));
            }
            if (toPrefetch.length >= 3) break;
          } catch {}
        }

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        for (let i = 0; i < toPrefetch.length && mounted; i++) {
          const uri = toPrefetch[i];
          const id = setTimeout(() => {
            try {
              if (mounted) prefetchQueue.enqueue(uri).catch(() => {});
            } catch {}
          }, i * 220);
          timeouts.push(id);
        }
        prefetchTimeoutsRef.current = timeouts;
      })();
    });
    return () => {
      mounted = false;
      cancel();
      prefetchTimeoutsRef.current.forEach(clearTimeout);
      prefetchTimeoutsRef.current = [];
    };
  }, [
    backgroundMediaWarmupEnabled,
    conversationId,
    processedMessages,
    scheduleLowPriorityTask,
    mediaPrefetchRunRef,
    prefetchTimeoutsRef,
    prefetchQueue,
    resolveMediaUri,
  ]);
}
