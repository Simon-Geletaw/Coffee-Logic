import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from 'src/redis/redis.constants';

/**
 * Cache-aside for the public catalogue.
 *
 * Keys carry a version number (`catalog:v<N>:…`). Invalidation is one
 * `INCR` on the version — every existing key becomes unreachable at once, no
 * SCAN/DEL over the keyspace, and stale entries simply age out via TTL.
 *
 * A cache failure must never fail a request: every Redis call is wrapped, and
 * on any error the loader runs against Postgres as if there were no cache.
 */
@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);
  static readonly VERSION_KEY = 'catalog:version';
  static readonly DEFAULT_TTL_SECONDS = 300;

  constructor(@Inject(REDIS) private readonly redis: Redis | null) {}

  get enabled(): boolean {
    return this.redis !== null;
  }

  private async version(): Promise<string> {
    const raw = await this.redis!.get(CatalogCacheService.VERSION_KEY);
    return raw ?? '0';
  }

  /** Stable key for a filter object regardless of property order. */
  static keyFor(scope: string, params: Record<string, unknown> = {}): string {
    const normalised = Object.entries(params)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${String(value)}`)
      .join('&');
    return `${scope}${normalised ? `?${normalised}` : ''}`;
  }

  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds = CatalogCacheService.DEFAULT_TTL_SECONDS,
  ): Promise<T> {
    if (!this.redis) return loader();

    let fullKey: string | null = null;
    try {
      fullKey = `catalog:v${await this.version()}:${key}`;
      const hit = await this.redis.get(fullKey);
      if (hit !== null) return JSON.parse(hit) as T;
    } catch (error) {
      this.logger.warn(
        `Cache read failed (${key}): ${(error as Error).message}`,
      );
    }

    const value = await loader();

    if (fullKey) {
      // Fire-and-forget: the response must not wait on the cache write.
      this.redis
        .set(fullKey, JSON.stringify(value), 'EX', ttlSeconds)
        .catch((error: Error) =>
          this.logger.warn(`Cache write failed (${key}): ${error.message}`),
        );
    }

    return value;
  }

  /** Called after any admin write that can change what the shop shows. */
  async invalidate(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.incr(CatalogCacheService.VERSION_KEY);
    } catch (error) {
      this.logger.warn(`Cache invalidate failed: ${(error as Error).message}`);
    }
  }
}
