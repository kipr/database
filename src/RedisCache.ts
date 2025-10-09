import Cache from './Cache';

import Redis, { RedisOptions } from 'ioredis';
import Selector from './model/Selector';

class RedisCache implements Cache {
  private static DEFAULT_TTL = 60 * 60 * 24 * 7;

  private redis_: Redis;

  constructor(options: RedisOptions) {
    this.redis_ = new Redis({
      ...options,
      connectTimeout: 500,         // 500ms to connect
      commandTimeout: 200,         // 200ms per command
      retryStrategy: (times) => {
        // Stop retrying after 2 attempts
        if (times > 2) return null;
        return 50; // Wait only 50ms between retries
      },
      maxRetriesPerRequest: 0,     // Don't retry - fail immediately
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
    try {
      if (!value) {
        await this.redis_.del(RedisCache.key_(selector));
        return;
      }
      await this.redis_.setex(RedisCache.key_(selector), RedisCache.DEFAULT_TTL, JSON.stringify(value));
    } catch (err) {
      console.error('Redis SET failed, continuing without cache:', err);
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