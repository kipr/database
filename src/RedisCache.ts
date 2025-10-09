import Cache from './Cache';

import Redis, { RedisOptions } from 'ioredis';
import Selector from './model/Selector';

class RedisCache implements Cache {
  // 1 hour TTL to limit stale data window if cache invalidation fails during Redis issues
  private static DEFAULT_TTL = 60 * 60;

  private redis_: Redis;

  constructor(options: RedisOptions) {
    this.redis_ = new Redis({
      ...options,
      connectTimeout: 500,         // 500ms to connect
      commandTimeout: 200,         // 200ms per command
      // retryStrategy controls retries for initial connection and reconnection attempts
      // maxRetriesPerRequest controls retries for individual commands (GET, SET, etc)
      retryStrategy: (times) => {
        // Stop reconnection attempts after 2 tries
        if (times > 2) return null;
        return 50; // Wait only 50ms between reconnection attempts
      },
      maxRetriesPerRequest: 0,     // Don't retry commands - fail immediately
      enableOfflineQueue: false,   // Don't queue commands when disconnected
    });
    
    this.redis_.on('error', (err) => {
      console.error('Redis error (app will continue without cache):', err.message);
    });
  }

  private static key_ = ({ collection, id }: Selector): string => {
    return `${collection}/${id}`;
  };

  async get(selector: Selector): Promise<object | null> {
    try {
      const data = await this.redis_.get(RedisCache.key_(selector));
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.error('Redis GET failed, continuing without cache:', err);
      return null;
    }
  }

  async set(selector: Selector, value: object | null): Promise<void> {
    // Cache-aside pattern: Only populate cache on reads, not writes
    // This prevents stale data if cache write fails but DB write succeeds
    // Instead, we just invalidate the cache entry on writes
    try {
      await this.redis_.del(RedisCache.key_(selector));
    } catch (err) {
      console.error('Redis cache invalidation failed, continuing without cache:', err);
      // Best effort - if invalidation fails, TTL will eventually clear stale data
    }
  }

  async remove(selector: Selector): Promise<void> {
    try {
      await this.redis_.del(RedisCache.key_(selector));
    } catch (err) {
      console.error('Redis DEL failed, continuing without cache:', err);
    }
  }
}

export default RedisCache;