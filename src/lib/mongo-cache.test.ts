import dbConnect from './db';
import CacheEntry from './models/CacheEntry';
import {
  buildMongoCacheKey,
  delMongoCacheByNamespace,
  getMongoCache,
  getOrSetMongoCache,
  setMongoCache,
  stableHash,
} from './mongo-cache';

jest.mock('./db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('./models/CacheEntry', () => ({
  __esModule: true,
  default: {
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

type StoredEntry = {
  cacheKey: string;
  namespace: string;
  value: unknown;
  expiresAt: Date;
};

describe('mongo-cache helpers', () => {
  const mockedDbConnect = dbConnect as jest.Mock;
  const mockedCacheEntry = CacheEntry as unknown as {
    deleteMany: jest.Mock;
    deleteOne: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let store: Map<string, StoredEntry>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    store = new Map();

    mockedDbConnect.mockResolvedValue(undefined);
    mockedCacheEntry.findOne.mockImplementation(async ({ cacheKey }: { cacheKey: string }) => {
      return store.get(cacheKey) ?? null;
    });
    mockedCacheEntry.findOneAndUpdate.mockImplementation(
      async (
        { cacheKey }: { cacheKey: string },
        update: { $set: StoredEntry },
      ) => {
        store.set(cacheKey, update.$set);
        return update.$set;
      },
    );
    mockedCacheEntry.deleteOne.mockImplementation(async ({ cacheKey }: { cacheKey: string }) => {
      const deletedCount = store.delete(cacheKey) ? 1 : 0;
      return { deletedCount };
    });
    mockedCacheEntry.deleteMany.mockImplementation(
      async ({ namespace }: { namespace: string }) => {
        let deletedCount = 0;
        for (const [key, entry] of Array.from(store.entries())) {
          if (entry.namespace === namespace) {
            store.delete(key);
            deletedCount += 1;
          }
        }
        return { deletedCount };
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hashes objects deterministically regardless of key order', () => {
    const first = stableHash({ b: 2, a: { d: 4, c: 3 } });
    const second = stableHash({ a: { c: 3, d: 4 }, b: 2 });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects empty and unsafe namespaces when building keys', () => {
    expect(() => buildMongoCacheKey('', ['user-1'])).toThrow('Mongo cache namespace is required.');
    expect(() => buildMongoCacheKey('timeline insights', ['user-1'])).toThrow(
      'Mongo cache namespace must contain only letters, numbers, colon, underscore, or hyphen.',
    );
  });

  it('sets and gets a value before expiry', async () => {
    const key = buildMongoCacheKey('cache-test', ['value']);

    await setMongoCache(key, 'cache-test', { count: 1 }, 60_000, { jitterRatio: 0 });

    await expect(getMongoCache<{ count: number }>(key)).resolves.toEqual({ count: 1 });
  });

  it('treats expired rows as misses and deletes them opportunistically', async () => {
    const key = buildMongoCacheKey('cache-test', ['expired']);
    store.set(key, {
      cacheKey: key,
      namespace: 'cache-test',
      value: 'stale',
      expiresAt: new Date(1_699_999_999_999),
    });

    await expect(getMongoCache<string>(key)).resolves.toBeNull();

    expect(mockedCacheEntry.deleteOne).toHaveBeenCalledWith({ cacheKey: key });
    expect(store.has(key)).toBe(false);
  });

  it('shares concurrent getOrSet fetches for the same key', async () => {
    const key = buildMongoCacheKey('cache-test', ['single-flight']);
    const fetcher = jest.fn(async () => {
      await Promise.resolve();
      return 'shared';
    });

    await expect(
      Promise.all([
        getOrSetMongoCache(key, 'cache-test', 60_000, fetcher, { jitterRatio: 0 }),
        getOrSetMongoCache(key, 'cache-test', 60_000, fetcher, { jitterRatio: 0 }),
      ]),
    ).resolves.toEqual(['shared', 'shared']);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache null unless allowNull is true', async () => {
    const key = buildMongoCacheKey('cache-test', ['null']);
    const uncachedFetcher = jest.fn(async () => null);

    await expect(
      getOrSetMongoCache(key, 'cache-test', 60_000, uncachedFetcher, { jitterRatio: 0 }),
    ).resolves.toBeNull();
    await expect(
      getOrSetMongoCache(key, 'cache-test', 60_000, uncachedFetcher, { jitterRatio: 0 }),
    ).resolves.toBeNull();
    expect(uncachedFetcher).toHaveBeenCalledTimes(2);

    const cachedFetcher = jest.fn(async () => null);
    await expect(
      getOrSetMongoCache(key, 'cache-test', 60_000, cachedFetcher, {
        allowNull: true,
        jitterRatio: 0,
      }),
    ).resolves.toBeNull();
    await expect(
      getOrSetMongoCache(key, 'cache-test', 60_000, cachedFetcher, {
        allowNull: true,
        jitterRatio: 0,
      }),
    ).resolves.toBeNull();

    expect(cachedFetcher).toHaveBeenCalledTimes(1);
    expect(mockedCacheEntry.findOneAndUpdate).toHaveBeenCalledWith(
      { cacheKey: key },
      expect.objectContaining({
        $set: expect.objectContaining({
          cacheKey: key,
          namespace: 'cache-test',
          value: null,
        }),
      }),
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });

  it('fails open and returns the fetcher result when storage writes fail', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const key = buildMongoCacheKey('cache-test', ['storage-failure']);
    mockedCacheEntry.findOneAndUpdate.mockRejectedValue(new Error('write failed'));

    await expect(
      getOrSetMongoCache(key, 'cache-test', 60_000, async () => 'fresh', { jitterRatio: 0 }),
    ).resolves.toBe('fresh');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Mongo cache set failed open'),
      expect.any(Error),
    );
  });

  it('guards namespace deletion and deletes matching namespace only', async () => {
    const keepKey = buildMongoCacheKey('cache-test-other', ['keep']);
    const deleteKey = buildMongoCacheKey('cache-test', ['delete']);
    store.set(keepKey, {
      cacheKey: keepKey,
      namespace: 'cache-test-other',
      value: 'keep',
      expiresAt: new Date(1_700_000_060_000),
    });
    store.set(deleteKey, {
      cacheKey: deleteKey,
      namespace: 'cache-test',
      value: 'delete',
      expiresAt: new Date(1_700_000_060_000),
    });

    await expect(delMongoCacheByNamespace('')).rejects.toThrow('Mongo cache namespace is required.');
    await expect(delMongoCacheByNamespace('cache-test')).resolves.toBe(1);

    expect(store.has(keepKey)).toBe(true);
    expect(store.has(deleteKey)).toBe(false);
  });
});
