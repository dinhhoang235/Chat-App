import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Connected to Redis');
  }
};

const MESSAGE_CACHE_KEY_PREFIX = 'chat:messages:';
const USER_STATUS_KEY_PREFIX = 'user:status:';
const CACHE_LIMIT = 50; // Cache 50 messages per conversation

/**
 * Set user online status in Redis
 */
export const setUserStatus = async (userId: number, status: 'online' | 'offline') => {
  try {
    const key = `${USER_STATUS_KEY_PREFIX}${userId}`;
    if (status === 'online') {
      await redisClient.set(key, 'online');
    } else {
      // Store current timestamp when going offline
      await redisClient.set(key, Date.now().toString());
    }
  } catch (err) {
    console.error('Redis Set User Status Error:', err);
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
    console.error('Redis Get User Status Error:', err);
    return null;
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
    console.error('Redis Cache Message Error:', err);
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
    console.error('Redis Get Cached Messages Error:', err);
    return null;
  }
};

/**
 * Bulk cache messages (used for warming up cache)
 */
export const bulkCacheMessages = async (conversationId: number, messages: any[]) => {
  try {
    const key = `${MESSAGE_CACHE_KEY_PREFIX}${conversationId}`;
    await redisClient.del(key);
    if (messages.length === 0) return;
    
    // Reverse because we want newest at index 0 (LPUSH)
    const reversed = [...messages].reverse();
    const stringified = reversed.map(m => JSON.stringify(m));
    await redisClient.lPush(key, stringified);
    await redisClient.lTrim(key, 0, CACHE_LIMIT - 1);
  } catch (err) {
    console.error('Redis Bulk Cache Error:', err);
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
    console.error('Redis Clear Cached Messages Error:', err);
  }
};

/**
 * Call related tracking
 */
const CALL_KEY_PREFIX = 'call:';

export const setCallInfo = async (callId: string, info: any) => {
  try {
    const key = `${CALL_KEY_PREFIX}${callId}`;
    await redisClient.set(key, JSON.stringify(info), {
      EX: 3600 // Expire in 1 hour
    });
  } catch (err) {
    console.error('Redis Set Call Info Error:', err);
  }
};

export const getCallInfo = async (callId: string) => {
  try {
    const key = `${CALL_KEY_PREFIX}${callId}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Redis Get Call Info Error:', err);
    return null;
  }
};

export const deleteCallInfo = async (callId: string) => {
  try {
    const key = `${CALL_KEY_PREFIX}${callId}`;
    await redisClient.del(key);
  } catch (err) {
    console.error('Redis Delete Call Info Error:', err);
  }
};
