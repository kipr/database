import Cache from './Cache';

import Redis, { RedisOptions } from 'ioredis';
import Selector from './model/Selector';
import { redisConnectionGauge, redisFailureCounter, redisSuccessCounter } from './metrics';

class RedisCache implements Cache {
  private static DEFAULT_TTL = 60 * 60 * 24 * 7;

  private redis_: Redis;

  constructor(options: RedisOptions) {
    this.redis_ = new Redis(options);
    
    this.redis_.on('connect', () => {
      console.log('Redis connected');
      redisConnectionGauge.set(1);
    });

    this.redis_.on('ready', () => {
      console.log('Redis ready');
      redisConnectionGauge.set(1);
    });

    this.redis_.on('error', (err) => {
      console.error('Redis error:', err.message);
      redisConnectionGauge.set(0);
    });

    this.redis_.on('close', () => {
      console.warn('Redis connection closed');
      redisConnectionGauge.set(0);
    });

    this.redis_.on('end', () => {
      console.warn('Redis connection ended');
      redisConnectionGauge.set(0);
    });
  }

  private static key_ = ({ collection, id }: Selector): string => {
    return `${collection}/${id}`;
  };

  async get(selector: Selector): Promise<object | null> {
    try {
      const data = await this.redis_.get(RedisCache.key_(selector));
      redisSuccessCounter.inc({ operation: 'get' });
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      redisFailureCounter.inc({ operation: 'get' });
      throw err;
    }
  }

  async set(selector: Selector, value: object | null): Promise<void> {
    try {
      if (!value) {
        await this.redis_.del(RedisCache.key_(selector));
        redisSuccessCounter.inc({ operation: 'set' });
        return;
      }
      await this.redis_.setex(RedisCache.key_(selector), RedisCache.DEFAULT_TTL, JSON.stringify(value));
      redisSuccessCounter.inc({ operation: 'set' });
    } catch (err) {
      redisFailureCounter.inc({ operation: 'set' });
      throw err;
    }
  }

  async remove(selector: Selector): Promise<void> {
    try {
      await this.redis_.del(RedisCache.key_(selector));
      redisSuccessCounter.inc({ operation: 'remove' });
    } catch (err) {
      redisFailureCounter.inc({ operation: 'remove' });
      throw err;
    }
  }
}

export default RedisCache;