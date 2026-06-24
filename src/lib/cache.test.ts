import { addCacheJitter, cacheKey, del, delByPrefix, get, getOrSet, set } from './cache';

describe('cache helpers', () => {
  beforeEach(() => {
    delByPrefix('cache-test');
  });

  afterEach(() => {
    jest.useRealTimers();
    delByPrefix('cache-test');
  });

  it('keeps jitter within the expected range and positive', () => {
    const values = Array.from({ length: 50 }, () => addCacheJitter(1000, 0.2));

    expect(values.every((value) => Number.isInteger(value))).toBe(true);
    expect(values.every((value) => value >= 800 && value <= 1200)).toBe(true);
    expect(addCacheJitter(-50)).toBeGreaterThan(0);
    expect(addCacheJitter(Number.POSITIVE_INFINITY)).toBeGreaterThan(0);
  });

  it('normalizes keys and skips empty parts', () => {
    expect(cacheKey([' cache-test ', null, undefined, '', 'user  id', 42, false])).toBe(
      'cache-test:user id:42:false',
    );
  });

  it('returns cached getOrSet values on the second call', async () => {
    const fetcher = jest.fn(async () => ({ count: 1 }));
    const key = 'cache-test:get-or-set';

    await expect(getOrSet(key, 1000, fetcher, { jitterRatio: 0 })).resolves.toEqual({ count: 1 });
    await expect(getOrSet(key, 1000, fetcher, { jitterRatio: 0 })).resolves.toEqual({ count: 1 });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('removes expired entries and refetches', async () => {
    jest.useFakeTimers();
    let fetchCount = 0;
    const fetcher = jest.fn(async () => {
      fetchCount += 1;
      return `value-${fetchCount}`;
    });
    const key = 'cache-test:expires';

    await expect(getOrSet(key, 1000, fetcher, { jitterRatio: 0 })).resolves.toBe('value-1');
    jest.advanceTimersByTime(1001);
    expect(get<string>(key)).toBeNull();
    await expect(getOrSet(key, 1000, fetcher, { jitterRatio: 0 })).resolves.toBe('value-2');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('shares concurrent getOrSet fetches for the same key', async () => {
    const fetcher = jest.fn(async () => {
      await Promise.resolve();
      return 'shared';
    });
    const key = 'cache-test:single-flight';

    await expect(
      Promise.all([
        getOrSet(key, 1000, fetcher, { jitterRatio: 0 }),
        getOrSet(key, 1000, fetcher, { jitterRatio: 0 }),
      ]),
    ).resolves.toEqual(['shared', 'shared']);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refuses to delete all entries with an empty prefix', () => {
    set('cache-test:prefix-guard', 'value', 1000);

    expect(() => delByPrefix('')).toThrow('Cache prefix is required.');
    expect(get('cache-test:prefix-guard')).toBe('value');
  });

  it('does not cache null unless allowNull is true', async () => {
    const key = 'cache-test:null';
    const uncachedFetcher = jest.fn(async () => null);

    await expect(getOrSet(key, 1000, uncachedFetcher, { jitterRatio: 0 })).resolves.toBeNull();
    await expect(getOrSet(key, 1000, uncachedFetcher, { jitterRatio: 0 })).resolves.toBeNull();
    expect(uncachedFetcher).toHaveBeenCalledTimes(2);

    del(key);
    const cachedFetcher = jest.fn(async () => null);
    await expect(
      getOrSet(key, 1000, cachedFetcher, { allowNull: true, jitterRatio: 0 }),
    ).resolves.toBeNull();
    await expect(
      getOrSet(key, 1000, cachedFetcher, { allowNull: true, jitterRatio: 0 }),
    ).resolves.toBeNull();
    expect(cachedFetcher).toHaveBeenCalledTimes(1);
  });
});
