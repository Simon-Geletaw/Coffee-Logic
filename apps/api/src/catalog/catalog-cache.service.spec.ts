import { CatalogCacheService } from './catalog-cache.service';

function makeRedis() {
  const store = new Map<string, string>();
  return {
    store,
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    incr: jest.fn((key: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return Promise.resolve(next);
    }),
  };
}

describe('CatalogCacheService', () => {
  it('runs the loader directly when Redis is not configured', async () => {
    const cache = new CatalogCacheService(null);
    const loader = jest.fn().mockResolvedValue(['db']);

    await expect(cache.getOrSet('list', loader)).resolves.toEqual(['db']);
    expect(cache.enabled).toBe(false);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('misses then hits: the loader runs once for repeated reads', async () => {
    const redis = makeRedis();
    const cache = new CatalogCacheService(redis as never);
    const loader = jest.fn().mockResolvedValue([{ id: 'p1' }]);

    await cache.getOrSet('list', loader);
    await new Promise((resolve) => setImmediate(resolve)); // let the async write land
    const second = await cache.getOrSet('list', loader);

    expect(second).toEqual([{ id: 'p1' }]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledWith(
      'catalog:v0:list',
      JSON.stringify([{ id: 'p1' }]),
      'EX',
      CatalogCacheService.DEFAULT_TTL_SECONDS,
    );
  });

  it('invalidate bumps the version so every old key is unreachable', async () => {
    const redis = makeRedis();
    const cache = new CatalogCacheService(redis as never);
    const loader = jest
      .fn()
      .mockResolvedValueOnce(['old'])
      .mockResolvedValueOnce(['new']);

    await cache.getOrSet('list', loader);
    await new Promise((resolve) => setImmediate(resolve));
    await cache.invalidate();
    const after = await cache.getOrSet('list', loader);

    expect(after).toEqual(['new']);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(redis.store.has('catalog:v1:list')).toBe(true);
  });

  it('falls through to the loader when Redis reads throw', async () => {
    const redis = makeRedis();
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    const cache = new CatalogCacheService(redis as never);
    const loader = jest.fn().mockResolvedValue(['db']);

    await expect(cache.getOrSet('list', loader)).resolves.toEqual(['db']);
  });

  it('does not fail the request when the cache write throws', async () => {
    const redis = makeRedis();
    redis.set.mockRejectedValue(new Error('OOM'));
    const cache = new CatalogCacheService(redis as never);

    await expect(
      cache.getOrSet('list', () => Promise.resolve(['db'])),
    ).resolves.toEqual(['db']);
  });

  it('does not fail invalidation when Redis is down', async () => {
    const redis = makeRedis();
    redis.incr.mockRejectedValue(new Error('down'));
    const cache = new CatalogCacheService(redis as never);

    await expect(cache.invalidate()).resolves.toBeUndefined();
  });

  describe('keyFor', () => {
    it('is stable across property order and drops empty values', () => {
      const a = CatalogCacheService.keyFor('list', {
        origin: 'Ethiopia',
        roastLevel: 'light',
        name: '',
      });
      const b = CatalogCacheService.keyFor('list', {
        roastLevel: 'light',
        name: undefined,
        origin: 'Ethiopia',
      });
      expect(a).toBe(b);
      expect(a).toBe('list?origin=Ethiopia&roastLevel=light');
    });

    it('returns the bare scope when there are no params', () => {
      expect(CatalogCacheService.keyFor('facets')).toBe('facets');
    });
  });
});
