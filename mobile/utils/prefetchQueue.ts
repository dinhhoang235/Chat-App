import { downloadToCache } from "./imageCache";

type Job = {
  url: string;
  resolve: (p: string | null) => void;
  reject: (e: any) => void;
};

class PrefetchQueue {
  queue: Job[] = [];
  concurrency: number;
  running = 0;
  seen = new Set<string>();

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
  }

  enqueue(url?: string | null) {
    if (!url) return Promise.resolve(null);
    if (this.seen.has(url)) {
      if (__DEV__) {
        try {
          console.log("[prefetchQueue] enqueue skipped (seen)", {
            url,
            ts: globalThis?.performance?.now?.() ?? Date.now(),
          });
        } catch {}
      }
      return Promise.resolve(null);
    }
    this.seen.add(url);
    if (__DEV__) {
      try {
        console.log("[prefetchQueue] enqueue", {
          url,
          queueLength: this.queue.length,
          running: this.running,
          ts: globalThis?.performance?.now?.() ?? Date.now(),
        });
      } catch {}
    }
    return new Promise<string | null>((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
      this.next();
    });
  }

  async next() {
    if (this.running >= this.concurrency) return;
    const job = this.queue.shift();
    if (!job) return;
    this.running++;
    try {
      const start = globalThis?.performance?.now?.() ?? Date.now();
      if (__DEV__) {
        try {
          console.log("[prefetchQueue] job start", {
            url: job.url,
            queueLength: this.queue.length,
            running: this.running,
            start,
          });
        } catch {}
      }

      const path = await downloadToCache(job.url);
      const elapsed = Math.round(
        (globalThis?.performance?.now?.() ?? Date.now()) - start,
      );
      if (__DEV__) {
        try {
          console.log("[prefetchQueue] job done", {
            url: job.url,
            elapsed,
            path,
          });
        } catch {}
      }
      job.resolve(path);
    } catch (e) {
      if (__DEV__) {
        try {
          console.warn("[prefetchQueue] job error", {
            url: job?.url,
            error: e,
          });
        } catch {}
      }
      job.reject(e);
    } finally {
      this.running--;
      // schedule next tick
      setTimeout(() => this.next(), 0);
    }
  }
}

// Keep concurrency conservative so background warming doesn't compete with first paint.
const shared = new PrefetchQueue(2);
export default shared;
