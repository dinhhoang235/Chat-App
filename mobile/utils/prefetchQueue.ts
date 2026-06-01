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
      return Promise.resolve(null);
    }
    this.seen.add(url);

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
      const path = await downloadToCache(job.url);
      job.resolve(path);
    } catch (e) {
      // errors intentionally not logged to reduce noise
      job.reject(e);
    } finally {
      this.running--;
      // schedule next tick
      setTimeout(() => this.next(), 0);
    }
  }

  // Clear any pending jobs in the queue (does not abort running jobs).
  clearPending() {
    this.queue = [];
  }

  // Adjust concurrency at runtime (minimum 1)
  setConcurrency(n: number) {
    this.concurrency = Math.max(1, Math.floor(n || 1));
  }
}

// Keep concurrency conservative so background warming doesn't compete with first paint.
const shared = new PrefetchQueue(2);
export default shared;
