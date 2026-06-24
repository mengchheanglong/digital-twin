import { createHash } from 'crypto';
import { addCacheJitter, del as delL1Cache, get as getL1Cache, set as setL1Cache } from './cache';
import dbConnect from './db';
import CacheEntry from './models/CacheEntry';

/**
 * Mongo-backed Tier 2 cache for derived, non-sensitive server values only.
 *
 * Do not store raw journals, chat transcripts, credentials, tokens, auth
 * responses, or profile PII here.
 */

const SAFE_NAMESPACE_PATTERN = /^[a-z0-9:_-]+$/i;
const KEY_PREFIX = 'dt';
const L1_PREFIX = 'mongo-cache';
const inFlight = new Map<string, Promise<unknown>>();

interface MongoCacheOptions {
  allowNull?: boolean;
  allowUndefined?: boolean;
  jitterRatio?: number;
  useL1?: boolean;
}

type MongoCacheLookup<T> = { hit: true; value: T } | { hit: false };

type JsonLike =
  | null
  | string
  | number
  | boolean
  | JsonLike[]
  | { [key: string]: JsonLike };

function assertSafeNamespace(namespace: string): void {
  if (!namespace) {
    throw new Error('Mongo cache namespace is required.');
  }

  if (!SAFE_NAMESPACE_PATTERN.test(namespace)) {
    throw new Error(
      'Mongo cache namespace must contain only letters, numbers, colon, underscore, or hyphen.',
    );
  }
}

function stableNormalize(value: unknown): JsonLike {
  if (value === null) return null;

  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item));
  }

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return value as string | number | boolean;
  }

  if (valueType === 'undefined') {
    return { $undefined: true };
  }

  if (valueType === 'bigint') {
    return { $bigint: String(value) };
  }

  if (valueType === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, JsonLike> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = stableNormalize(record[key]);
    }
    return sorted;
  }

  return { $type: valueType, value: String(value) };
}

function l1Key(key: string): string {
  return `${L1_PREFIX}:${key}`;
}

function partToKeySegment(part: unknown): string {
  if (
    part === null ||
    part === undefined ||
    typeof part === 'string' ||
    typeof part === 'number' ||
    typeof part === 'boolean'
  ) {
    return encodeURIComponent(String(part));
  }

  return stableHash(part);
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableNormalize(value))).digest('hex');
}

export function buildMongoCacheKey(namespace: string, parts: unknown[]): string {
  assertSafeNamespace(namespace);

  const segments = parts.map(partToKeySegment).filter((part) => part.length > 0);
  return [KEY_PREFIX, namespace, ...segments].join(':');
}

async function getMongoCacheLookup<T>(key: string): Promise<MongoCacheLookup<T>> {
  try {
    await dbConnect();

    const entry = await CacheEntry.findOne({ cacheKey: key });
    if (!entry) return { hit: false };

    const expiresAt = new Date(entry.expiresAt).getTime();
    if (expiresAt <= Date.now()) {
      await CacheEntry.deleteOne({ cacheKey: key });
      delL1Cache(l1Key(key));
      return { hit: false };
    }

    const ttlMs = Math.max(1, expiresAt - Date.now());
    if (entry.value !== null && entry.value !== undefined) {
      setL1Cache(l1Key(key), entry.value, ttlMs);
    }
    return { hit: true, value: entry.value as T };
  } catch (error) {
    console.warn('Mongo cache get failed open.', error);
    return { hit: false };
  }
}

export async function getMongoCache<T>(key: string): Promise<T | null> {
  const result = await getMongoCacheLookup<T>(key);
  return result.hit ? result.value : null;
}

export async function setMongoCache<T>(
  key: string,
  namespace: string,
  value: T,
  ttlMs: number,
  options: MongoCacheOptions = {},
): Promise<void> {
  try {
    assertSafeNamespace(namespace);
    await dbConnect();

    const jitteredTtlMs = addCacheJitter(ttlMs, options.jitterRatio ?? 0.2);
    const expiresAt = new Date(Date.now() + jitteredTtlMs);

    await CacheEntry.findOneAndUpdate(
      { cacheKey: key },
      {
        $set: {
          cacheKey: key,
          namespace,
          value,
          expiresAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (options.useL1 !== false && (value !== null || options.allowNull === true)) {
      setL1Cache(l1Key(key), value, jitteredTtlMs);
    }
  } catch (error) {
    console.warn('Mongo cache set failed open.', error);
  }
}

export async function delMongoCache(key: string): Promise<number> {
  try {
    await dbConnect();
    const result = await CacheEntry.deleteOne({ cacheKey: key });
    delL1Cache(l1Key(key));
    return result.deletedCount ?? 0;
  } catch (error) {
    console.warn('Mongo cache delete failed open.', error);
    return 0;
  }
}

export async function delMongoCacheByNamespace(namespace: string): Promise<number> {
  assertSafeNamespace(namespace);

  try {
    await dbConnect();
    const result = await CacheEntry.deleteMany({ namespace });
    return result.deletedCount ?? 0;
  } catch (error) {
    console.warn('Mongo cache namespace delete failed open.', error);
    return 0;
  }
}

export async function getOrSetMongoCache<T>(
  key: string,
  namespace: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  options: MongoCacheOptions = {},
): Promise<T> {
  const useL1 = options.useL1 !== false;
  if (useL1) {
    const cached = getL1Cache<T>(l1Key(key));
    if (cached !== null) return cached;
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = (async () => {
    try {
      const mongoValue = await getMongoCacheLookup<T>(key);
      if (mongoValue.hit) return mongoValue.value;

      const value = await fetcher();
      const shouldCache =
        (value !== null && value !== undefined) ||
        (value === null && options.allowNull === true) ||
        (value === undefined && options.allowUndefined === true);

      if (shouldCache) {
        await setMongoCache(key, namespace, value, ttlMs, options);
      }

      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}
