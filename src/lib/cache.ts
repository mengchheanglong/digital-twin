/**
 * Small in-process L1 cache for derived, non-sensitive server values.
 *
 * Do not store raw journals, chat messages, or other personal data here unless
 * a caller has explicitly reviewed the privacy tradeoff for that value.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface GetOrSetOptions {
  allowNull?: boolean;
  jitterRatio?: number;
}

const entries = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export function addCacheJitter(ttlMs: number, ratio = 0.2): number {
  const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 1;
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 0;
  const delta = safeTtl * safeRatio;
  const jittered = safeTtl + (Math.random() * 2 - 1) * delta;

  return Math.max(1, Math.floor(jittered));
}

export function cacheKey(parts: Array<string | number | boolean | null | undefined>): string {
  return parts
    .map((part) => {
      if (part === null || part === undefined) return '';
      return String(part).trim().replace(/\s+/g, ' ');
    })
    .filter((part) => part.length > 0)
    .join(':');
}

export function get<T>(key: string): T | null {
  const entry = getEntry<T>(key);
  return entry?.value ?? null;
}

function getEntry<T>(key: string): CacheEntry<T> | null {
  const entry = entries.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    entries.delete(key);
    return null;
  }

  return entry as CacheEntry<T>;
}

export function set<T>(key: string, value: T, ttlMs: number): void {
  entries.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, Math.floor(ttlMs)),
  });
}

export function del(key: string): void {
  entries.delete(key);
}

export function delByPrefix(prefix: string): void {
  if (!prefix) {
    throw new Error('Cache prefix is required.');
  }

  for (const key of Array.from(entries.keys())) {
    if (key.startsWith(prefix)) {
      entries.delete(key);
    }
  }
}

export async function getOrSet<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  options: GetOrSetOptions = {},
): Promise<T> {
  const cached = getEntry<T>(key);
  if (cached) return cached.value;

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = (async () => {
    try {
      const value = await fetcher();
      if (value !== null || options.allowNull === true) {
        set(key, value, addCacheJitter(ttlMs, options.jitterRatio ?? 0.2));
      }
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}
