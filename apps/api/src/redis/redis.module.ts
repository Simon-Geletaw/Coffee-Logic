import { Global, Module, type OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS } from './redis.constants';

/**
 * One shared ioredis client for the whole app.
 *
 * Global so any module can `@Inject(REDIS)` without importing this module.
 * When REDIS_URL is unset (local dev without docker, unit tests) the provider
 * resolves to null — consumers must treat that as "cache disabled", never as
 * an error, so the shop keeps serving from Postgres.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis | null => {
        const url = config.get<string>('REDIS_URL');
        if (!url) return null;

        return new Redis(url, {
          // Connect at boot. Commands issued during the brief connect window
          // queue (offline queue on), but a Redis that is actually down fails
          // each command after one retry instead of hanging the request —
          // checkout then fails closed, the catalogue falls back to Postgres.
          connectTimeout: 2_000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: true,
          lazyConnect: false,
        });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis | null) {}

  // Close the socket on shutdown so tests and graceful restarts do not hang
  // on an open handle.
  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }
}
