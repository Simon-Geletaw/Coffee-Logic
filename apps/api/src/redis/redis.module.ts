import { Global, Module } from '@nestjs/common';
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
          // Don't hang a request forever if Redis is down — surface fast and
          // let the caller decide (checkout fails closed, catalog falls back).
          connectTimeout: 2_000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          lazyConnect: true,
        });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
