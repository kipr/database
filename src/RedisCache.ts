import Cache from './Cache';

import Redis, { RedisOptions } from 'ioredis';
import Selector from 'database-model/Selector';

class RedisCache implements Cache {
  private static DEFAULT_TTL = 60 * 60 * 24 * 7;

  private redis_: Redis;

  constructor(options: RedisOptions) {
    this.redis_ = new Redis(options);
  }

  private static key_ = ({ collection, id }: Selector): string => {
    return `${collection}/${id}`;
  };

  async get(selector: Selector): Promise<object | null> {
    const data = await this.redis_.get(RedisCache.key_(selector));
    if (!data) return null;

    return JSON.parse(data);
  }

  async set(selector: Selector, value: object | null): Promise<void> {
    if (!value) {
      await this.redis_.del(RedisCache.key_(selector));
      return;
    }

    await this.redis_.setex(RedisCache.key_(selector), RedisCache.DEFAULT_TTL, JSON.stringify(value));
  }

  async remove(selector: Selector): Promise<void> {
    await this.redis_.del(RedisCache.key_(selector));
  }
}

export default RedisCache;