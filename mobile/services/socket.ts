import { io, Socket } from "socket.io-client";
import { tokenStorage } from "@/utils/tokenStorage";
import { log, warn, error } from "@/utils/logger"; // adjust path as needed

// Use environment variable for socket URL
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

log("[Socket] Socket URL:", SOCKET_URL);

class SocketService {
  private socket: Socket | null = null;

  private emitQueue: {
    event: string;
    data: any;
    callback?: (response: any) => void;
    ts: number;
    _key?: string;
  }[] = [];
  private queueCleanerId: NodeJS.Timeout | null = null;
  private readonly QUEUE_TIMEOUT_MS = 30000; // 30s timeout for queued emits
  private listenerQueue: {
    event: string;
    callback: (data: any) => void;
    wrapped?: (data: any) => void;
    ts?: number;
    _key?: string;
  }[] = [];
  private statusListeners: ((connected: boolean) => void)[] = [];
  private tokenRefreshUnsubscribe: (() => void) | null = null;
  private callbackMap: Map<
    string,
    Map<(data: any) => void, (data: any) => void>
  > = new Map();

  private createSocket(token: string) {
    if (!SOCKET_URL) {
      error(
        "[Socket] ERROR: SOCKET_URL is not defined. Set EXPO_PUBLIC_SOCKET_URL.",
      );
      return;
    }

    if (this.socket) return;

    log(
      `[Socket] Creating socket connection with token (${token?.length || 0} chars)`,
    );
    this.callbackMap.clear(); // Clear old callbacks when creating new socket
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 30000,
    });

    this.socket.on("connect", () => {
      log("[Socket] ✅ Connected to socket server");
      this.notifyStatusListeners(true);
      // Start queue cleaner
      this.startQueueCleaner();

      // Process queued emits on successful connect
      while (this.emitQueue.length > 0) {
        const item = this.emitQueue.shift();
        if (item) {
          log(`[Socket] 📤 Processing queued emit: "${item.event}"`);
          if (item.callback) {
            this.socket?.emit(item.event, item.data, item.callback);
          } else {
            this.socket?.emit(item.event, item.data);
          }
        }
      }
    });

    // Register queued listeners AFTER connect event setup
    while (this.listenerQueue.length > 0) {
      const item = this.listenerQueue.shift();
      if (item) {
        log(`[Socket] 📥 Registering queued listener: "${item.event}"`);

        // Use pre-wrapped callback if available, otherwise create one
        const wrappedCallback =
          item.wrapped ||
          ((data: any) => {
            log(`[Socket] 📨 Received "${item.event}":`, data);
            item.callback(data);
          });

        // Store mapping
        if (!this.callbackMap.has(item.event)) {
          this.callbackMap.set(item.event, new Map());
        }
        this.callbackMap.get(item.event)!.set(item.callback, wrappedCallback);

        this.socket.on(item.event, wrappedCallback);
      }
    }

    this.socket.on("disconnect", (reason) => {
      log("[Socket] ❌ Disconnected. Reason:", reason);
      this.notifyStatusListeners(false);
      // Stop queue cleaner while disconnected
      this.stopQueueCleaner();
    });

    this.socket.on("connect_error", (err: any) => {
      const errorMsg = err?.message || err?.code || JSON.stringify(err);
      warn("[Socket] ⚠️ Connect error:", errorMsg);
      log("[Socket] Error details:", err);
      log("[Socket] Trying to connect to:", SOCKET_URL);
      this.notifyStatusListeners(false);
    });

    this.socket.on("reconnect_attempt", () => {
      log("[Socket] 🔄 Reconnect attempt...");
    });

    this.socket.on("auth_error", (err: any) => {
      warn("[Socket] 🔐 Auth error:", err);
    });
  }

  connect() {
    if (this.socket) {
      log("[Socket] Socket already exists, skipping connect");
      return;
    }

    // Subscribe to token refresh events to reconnect with new token
    if (!this.tokenRefreshUnsubscribe) {
      this.tokenRefreshUnsubscribe = tokenStorage.onTokenRefresh(() => {
        log("[Socket] 🔐 Token refreshed, reconnecting socket...");
        if (this.socket) {
          this.socket.disconnect();
          this.socket = null;
        }
        // Reconnect with fresh token
        this.connect();
      });
    }

    const cachedToken = tokenStorage.getCachedAccessToken();
    log(
      "[Socket] Cached token:",
      cachedToken ? "present" : "null/undefined",
    );

    if (cachedToken) {
      log("[Socket] Connecting with cached token");
      this.createSocket(cachedToken);
      return;
    }

    log("[Socket] No cached token, fetching from storage...");
    tokenStorage.getAccessToken().then((token) => {
      if (!token) {
        warn("[Socket] ❌ No token available, cannot connect");
        return;
      }
      log("[Socket] 📥 Connecting with token from storage");
      this.createSocket(token);
    });
  }

  disconnect() {
    if (this.socket) {
      log("[Socket] Disconnecting socket");
      this.socket.disconnect();
      this.socket = null;
      this.callbackMap.clear(); // Clear callback map when disconnecting
      this.notifyStatusListeners(false);
    }
    // Stop queue cleaner but keep queued emits in memory for reconnect
    this.stopQueueCleaner();
    // Unsubscribe from token refresh events
    if (this.tokenRefreshUnsubscribe) {
      this.tokenRefreshUnsubscribe();
      this.tokenRefreshUnsubscribe = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  onStatusChange(callback: (connected: boolean) => void) {
    this.statusListeners.push(callback);
    // Call immediately with current status
    callback(this.isConnected());
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== callback);
    };
  }

  private notifyStatusListeners(connected: boolean) {
    this.statusListeners.forEach((listener) => listener(connected));
  }

  getSocket() {
    return this.socket;
  }

  emit(event: string, data: any, callback?: (response: any) => void) {
    log(`[Socket] Emitting "${event}":`, data);
    if (this.socket?.connected) {
      if (callback) {
        this.socket.emit(event, data, callback);
      } else {
        this.socket.emit(event, data);
      }
    } else {
      log(`[Socket] ⏳ Socket not connected, queuing "${event}" emit`);

      // Create a simple dedupe key based on event + data serialization
      const safeStringify = (v: any) => {
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      };

      const key = `${event}|${safeStringify(data)}`;

      // If an identical queued emit exists, merge callbacks to avoid duplication
      const existing = this.emitQueue.find((e) => e._key === key);
      if (existing) {
        if (callback) {
          const prevCb = existing.callback;
          existing.callback = (res: any) => {
            try {
              prevCb && prevCb(res);
            } catch (e) {
              error("Error in previous queued emit callback", e);
            }
            try {
              callback(res);
            } catch (e) {
              error("Error in merged queued emit callback", e);
            }
          };
        }
      } else {
        this.emitQueue.push({
          event,
          data,
          callback,
          ts: Date.now(),
          _key: key,
        });
      }

      if (!this.socket) this.connect();
    }
  }

  private startQueueCleaner() {
    if (this.queueCleanerId) return;
    this.queueCleanerId = setInterval(() => {
      const now = Date.now();
      const expired: typeof this.emitQueue = [];
      // Collect expired items
      for (const item of this.emitQueue) {
        if (now - (item.ts || 0) > this.QUEUE_TIMEOUT_MS) {
          expired.push(item);
        }
      }
      if (expired.length === 0) return;
      // Remove expired items from queue and notify callbacks
      this.emitQueue = this.emitQueue.filter((i) => !expired.includes(i));
      expired.forEach((it) => {
        try {
          it.callback && it.callback({ error: "Socket emit timed out" });
        } catch (e) {
          error("Error invoking expired emit callback", e);
        }
      });
    }, 2000);
  }

  private stopQueueCleaner() {
    if (this.queueCleanerId) {
      clearInterval(this.queueCleanerId);
      this.queueCleanerId = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    log(`[Socket] Registering listener for "${event}"`);
    if (this.socket) {
      // Create wrapper function with logging
      const wrappedCallback = (data: any) => {
        log(`[Socket] 📨 Received "${event}":`, data);
        callback(data);
      };

      // Store mapping from original callback to wrapped callback
      if (!this.callbackMap.has(event)) {
        this.callbackMap.set(event, new Map());
      }
      this.callbackMap.get(event)!.set(callback, wrappedCallback);

      this.socket.on(event, wrappedCallback);
    } else {
      log(`[Socket] ⏳ Socket not ready, queuing listener for "${event}"`);
      // Pre-wrap callback so we can reliably remove it or register later
      const wrappedCallback = (data: any) => {
        log(`[Socket] 📨 Received "${event}":`, data);
        callback(data);
      };
      const key = `${event}|${String(callback)}`;
      this.listenerQueue.push({
        event,
        callback,
        wrapped: wrappedCallback,
        ts: Date.now(),
        _key: key,
      });
      this.connect();
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      if (callback) {
        // Look up the wrapped callback from our map
        const wrappedCallback = this.callbackMap.get(event)?.get(callback);
        if (wrappedCallback) {
          log(`[Socket] ❌ Unregistering listener for "${event}"`);
          this.socket.off(event, wrappedCallback);
          this.callbackMap.get(event)?.delete(callback);
        } else {
          warn(
            `[Socket] ⚠️ Could not find wrapped callback for "${event}"`,
          );
          // Fallback: try to remove with callback directly
          this.socket.off(event, callback);
          // Also remove from listenerQueue if present
          this.listenerQueue = this.listenerQueue.filter(
            (l) => l.event !== event || l.callback !== callback,
          );
        }
      } else {
        log(`[Socket] ❌ Unregistering all listeners for "${event}"`);
        this.socket.off(event);
        this.callbackMap.delete(event);
      }
    } else {
      // Remove from queue if it hasn't been registered yet
      if (callback) {
        // Remove queued listener by original callback reference
        this.listenerQueue = this.listenerQueue.filter(
          (l) => l.event !== event || l.callback !== callback,
        );
      } else {
        this.listenerQueue = this.listenerQueue.filter(
          (l) => l.event !== event,
        );
      }
    }
  }
}

export const socketService = new SocketService();