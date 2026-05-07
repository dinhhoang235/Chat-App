import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("Connected to Redis");
  }
};

const MESSAGE_CACHE_KEY_PREFIX = "chat:messages:";
const USER_STATUS_KEY_PREFIX = "user:status:";
const CACHE_LIMIT = 200; // OPTIMIZATION #5: Increased from 50 to 200 messages per conversation for better offline access and faster 2nd+ open

/**
 * Set user online status in Redis
 */
export const setUserStatus = async (
  userId: number,
  status: "online" | "offline",
) => {
  try {
    const key = `${USER_STATUS_KEY_PREFIX}${userId}`;
    if (status === "online") {
      // Store structured JSON to be explicit
      await redisClient.set(key, JSON.stringify({ status: "online" }));
    } else {
      // Store structured JSON with lastSeen when going offline
      await redisClient.set(
        key,
        JSON.stringify({ status: "offline", lastSeen: Date.now() }),
      );
    }
  } catch (err) {
    console.error("Redis Set User Status Error:", err);
  }
};

/**
 * Get user online status from Redis
 */
export const getUserStatus = async (userId: number): Promise<string | null> => {
  try {
    const key = `${USER_STATUS_KEY_PREFIX}${userId}`;
    const status = await redisClient.get(key);
    return status;
  } catch (err) {
    console.error("Redis Get User Status Error:", err);
    return null;
  }
};

/**
 * Get structured user status: { status: 'online'|'offline', lastSeen: number | null }
 * Backwards-compatible with existing string-based storage ("online" or timestamp string).
 */
export const getUserStatusStructured = async (
  userId: number,
): Promise<{
  status: "online" | "offline";
  lastSeen: number | null;
} | null> => {
  try {
    const key = `${USER_STATUS_KEY_PREFIX}${userId}`;
    const raw = await redisClient.get(key);
    if (!raw) return { status: "offline", lastSeen: null };

    // If stored as 'online'
    if (raw === "online") return { status: "online", lastSeen: null };

    // Try parse as JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.status) {
        return {
          status: parsed.status === "online" ? "online" : "offline",
          lastSeen: parsed.lastSeen || null,
        };
      }
    } catch {
      // Not JSON
    }

    // Otherwise assume it's a timestamp string
    const ts = Number(raw);
    if (!Number.isNaN(ts)) {
      return { status: "offline", lastSeen: ts };
    }

    return { status: "offline", lastSeen: null };
  } catch (err) {
    console.error("Redis Get Structured User Status Error:", err);
    return null;
  }
};

/**
 * Batch get user statuses for multiple users (optimized N+1 query fix)
 * Uses Redis MGET to fetch all statuses in one round trip instead of N requests
 */
export const getUsersStatusStructured = async (
  userIds: number[],
): Promise<
  Map<number, { status: "online" | "offline"; lastSeen: number | null }>
> => {
  try {
    if (userIds.length === 0) return new Map();

    // Build keys for all users
    const keys = userIds.map((id) => `${USER_STATUS_KEY_PREFIX}${id}`);

    // Fetch all in one Redis call (mget)
    const results = await redisClient.mGet(keys);

    // Map results back to userIds
    const statusMap = new Map();

    userIds.forEach((userId, index) => {
      const raw = results[index];

      if (!raw) {
        statusMap.set(userId, { status: "offline", lastSeen: null });
        return;
      }

      // If stored as 'online'
      if (raw === "online") {
        statusMap.set(userId, { status: "online", lastSeen: null });
        return;
      }

      // Try parse as JSON
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.status) {
          statusMap.set(userId, {
            status: parsed.status === "online" ? "online" : "offline",
            lastSeen: parsed.lastSeen || null,
          });
          return;
        }
      } catch {
        // Not JSON
      }

      // Otherwise assume it's a timestamp string
      const ts = Number(raw);
      if (!Number.isNaN(ts)) {
        statusMap.set(userId, { status: "offline", lastSeen: ts });
        return;
      }

      statusMap.set(userId, { status: "offline", lastSeen: null });
    });

    return statusMap;
  } catch (err) {
    console.error("Redis Get Users Status Batch Error:", err);
    // Return empty map on error to not break the flow
    return new Map();
  }
};

/**
 * Cache new messages into Redis List (LPUSH)
 */
export const cacheMessage = async (conversationId: number, message: any) => {
  try {
    const key = `${MESSAGE_CACHE_KEY_PREFIX}${conversationId}`;
    // LPUSH to keep newest at the front (index 0)
    await redisClient.lPush(key, JSON.stringify(message));
    // Trim to keep only CACHE_LIMIT
    await redisClient.lTrim(key, 0, CACHE_LIMIT - 1);
  } catch (err) {
    console.error("Redis Cache Message Error:", err);
  }
};

/**
 * Get initial messages from cache
 */
export const getCachedMessages = async (conversationId: number, limit = 20) => {
  try {
    const key = `${MESSAGE_CACHE_KEY_PREFIX}${conversationId}`;
    const messages = await redisClient.lRange(key, 0, limit - 1);
    return messages.map((m) => JSON.parse(m));
  } catch (err) {
    console.error("Redis Get Cached Messages Error:", err);
    return null;
  }
};

/**
 * Bulk cache messages (used for warming up cache)
 */
export const bulkCacheMessages = async (
  conversationId: number,
  messages: any[],
) => {
  try {
    const key = `${MESSAGE_CACHE_KEY_PREFIX}${conversationId}`;
    await redisClient.del(key);
    if (messages.length === 0) return;

    // Reverse because we want newest at index 0 (LPUSH)
    const reversed = [...messages].reverse();
    const stringified = reversed.map((m) => JSON.stringify(m));
    await redisClient.lPush(key, stringified);
    await redisClient.lTrim(key, 0, CACHE_LIMIT - 1);
  } catch (err) {
    console.error("Redis Bulk Cache Error:", err);
  }
};

/**
 * Clear cached messages for a conversation
 */
export const clearCachedMessages = async (conversationId: number) => {
  try {
    const key = `${MESSAGE_CACHE_KEY_PREFIX}${conversationId}`;
    await redisClient.del(key);
  } catch (err) {
    console.error("Redis Clear Cached Messages Error:", err);
  }
};

/**
 * Call related tracking
 */
const CALL_KEY_PREFIX = "call:";

export const setCallInfo = async (callId: string, info: any) => {
  try {
    const key = `${CALL_KEY_PREFIX}${callId}`;
    await redisClient.set(key, JSON.stringify(info), {
      EX: 3600, // Expire in 1 hour
    });
  } catch (err) {
    console.error("Redis Set Call Info Error:", err);
  }
};

export const getCallInfo = async (callId: string) => {
  try {
    const key = `${CALL_KEY_PREFIX}${callId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Redis Get Call Info Error:", err);
    return null;
  }
};

export const deleteCallInfo = async (callId: string) => {
  try {
    const key = `${CALL_KEY_PREFIX}${callId}`;
    await redisClient.del(key);
  } catch (err) {
    console.error("Redis Delete Call Info Error:", err);
  }
};

const CONVERSATION_CALL_KEY_PREFIX = "conversation_call:";

export const setConversationCallId = async (
  conversationId: number | string,
  callId: string,
) => {
  try {
    const key = `${CONVERSATION_CALL_KEY_PREFIX}${conversationId}`;
    await redisClient.set(key, callId, {
      EX: 3600,
    });
  } catch (err) {
    console.error("Redis Set Conversation Call Id Error:", err);
  }
};

export const getConversationCallId = async (
  conversationId: number | string,
) => {
  try {
    const key = `${CONVERSATION_CALL_KEY_PREFIX}${conversationId}`;
    return await redisClient.get(key);
  } catch (err) {
    console.error("Redis Get Conversation Call Id Error:", err);
    return null;
  }
};

export const deleteConversationCallId = async (
  conversationId: number | string,
) => {
  try {
    const key = `${CONVERSATION_CALL_KEY_PREFIX}${conversationId}`;
    await redisClient.del(key);
  } catch (err) {
    console.error("Redis Delete Conversation Call Id Error:", err);
  }
};
