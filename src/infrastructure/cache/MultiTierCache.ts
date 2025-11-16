import { Redis } from '@upstash/redis';

export class MultiTierCache {
  private l1 = new Map<string, any>();
  private l2: Redis;

  constructor(redisUrl?: string) {
    this.l2 = new Redis({ url: redisUrl || process.env.UPSTASH_REDIS_URL! });
  }

  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    // L1 check
    if (this.l1.has(key)) return this.l1.get(key);

    // L2 check
    const l2Value = await this.l2.get(key);
    if (l2Value) {
      const parsed = JSON.parse(l2Value);
      this.l1.set(key, parsed);
      return parsed;
    }

    // L3 fetch
    const value = await fetcher();

    // Populate caches
    this.l1.set(key, value);
    await this.l2.setex(key, ttl, JSON.stringify(value));

    return value;
  }
}
