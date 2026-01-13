import Redis from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

let redis: Redis | null = null;
let subscriber: Redis | null = null;

export async function initializeRedis(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      redis = new Redis(config.redis.url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      redis.on('connect', () => {
        logger.info('Redis connected');
      });

      redis.on('error', (error) => {
        logger.error('Redis error:', error);
      });

      redis
        .connect()
        .then(() => {
          // Create subscriber instance for pub/sub
          subscriber = redis!.duplicate();
          resolve();
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Cache operations
export async function setCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  if (!redis) throw new Error('Redis not initialized');

  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) throw new Error('Redis not initialized');

  const value = await redis.get(key);
  if (!value) return null;

  return JSON.parse(value) as T;
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis) throw new Error('Redis not initialized');
  await redis.del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redis) throw new Error('Redis not initialized');

  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Pub/Sub operations
export async function publish(channel: string, message: unknown): Promise<void> {
  if (!redis) throw new Error('Redis not initialized');
  await redis.publish(channel, JSON.stringify(message));
}

export async function subscribe(
  channel: string,
  callback: (message: string) => void
): Promise<void> {
  if (!subscriber) throw new Error('Redis subscriber not initialized');

  await subscriber.subscribe(channel);
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      callback(message);
    }
  });
}

export function getRedis(): Redis | null {
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (subscriber) {
    subscriber.disconnect();
    subscriber = null;
  }
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}
