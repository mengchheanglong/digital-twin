export interface ClientCacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

const STORAGE_PREFIX = "digital-twin:client-cache:";
const memoryCache = new Map<string, ClientCacheEntry<unknown>>();

// Store only derived, render-safe response data here. Do not store secrets,
// raw journals, chat transcripts, tokens, credentials, or other sensitive text.

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function getSessionStorage(): Storage | null {
  if (!isBrowser()) return null;

  try {
    return window.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function isEntry<T>(value: unknown): value is ClientCacheEntry<T> {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ClientCacheEntry<T>>;
  return typeof entry.expiresAt === "number" && typeof entry.storedAt === "number";
}

function isExpired(entry: ClientCacheEntry<unknown>): boolean {
  return entry.expiresAt <= Date.now();
}

function removeFromStorage(key: string): void {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(storageKey(key));
  } catch {
    // Best effort only.
  }
}

export function getClientCache<T>(key: string): T | null {
  if (!isBrowser()) return null;

  const memoryEntry = memoryCache.get(key);
  if (memoryEntry) {
    if (isExpired(memoryEntry)) {
      removeClientCache(key);
      return null;
    }

    return memoryEntry.value as T;
  }

  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(storageKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isEntry<T>(parsed)) {
      removeClientCache(key);
      return null;
    }

    if (isExpired(parsed)) {
      removeClientCache(key);
      return null;
    }

    memoryCache.set(key, parsed);
    return parsed.value;
  } catch {
    removeClientCache(key);
    return null;
  }
}

export function setClientCache<T>(key: string, value: T, ttlMs: number): void {
  if (!isBrowser()) return;

  const now = Date.now();
  const entry: ClientCacheEntry<T> = {
    value,
    expiresAt: now + Math.max(0, ttlMs),
    storedAt: now,
  };

  memoryCache.set(key, entry);

  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Keep the in-memory cache even when sessionStorage is unavailable/full.
  }
}

export function removeClientCache(key: string): void {
  memoryCache.delete(key);
  removeFromStorage(key);
}

export function clearClientCacheByPrefix(prefix: string): void {
  if (!prefix) {
    throw new Error("Client cache prefix is required.");
  }

  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  const storage = getSessionStorage();
  if (!storage) return;

  try {
    const storagePrefix = storageKey(prefix);
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(storagePrefix)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // Best effort only.
  }
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return parseJsonObject(window.atob(padded));
  } catch {
    return null;
  }
}

function firstStringValue(
  source: Record<string, unknown> | null,
  keys: string[],
): string | null {
  if (!source) return null;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function getLocalStorage(): Storage | null {
  if (!isBrowser()) return null;

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function getUserScopeId(): string {
  const storage = getLocalStorage();
  if (!storage) return "anonymous";

  const tokenPayload = decodeJwtPayload(storage.getItem("token"));
  const tokenIdentity = firstStringValue(tokenPayload, ["id", "sub", "email"]);
  if (tokenIdentity) return tokenIdentity;

  const profile = parseJsonObject(storage.getItem("userProfile"));
  return firstStringValue(profile, ["id", "_id", "email"]) ?? "anonymous";
}

function normalizeKeyPart(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function makeUserScopedCacheKey(scope: string, key: string): string {
  const userScopeId = normalizeKeyPart(getUserScopeId());
  return `${normalizeKeyPart(scope)}:${userScopeId}:${normalizeKeyPart(key)}`;
}
