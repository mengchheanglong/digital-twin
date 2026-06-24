import dbConnect from './db';
import RateLimitEntry from './models/RateLimitEntry';
import { getClientIp } from './request';
import { NextResponse } from 'next/server';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

export type RateLimitKeyResolver = (req: Request, userId?: string | null) => string;

/**
 * In-process rate limiter backed by a plain Map.
 * Suitable only for single-process environments (local dev, tests).
 * Use MongoRateLimiter in production/serverless deployments.
 */
export class RateLimiter {
  private requests: Map<string, RateLimitInfo>;
  private windowMs: number;
  private limit: number;

  constructor(windowMs: number, limit: number) {
    this.requests = new Map();
    this.windowMs = windowMs;
    this.limit = limit;
  }

  check(key: string): boolean {
    const now = Date.now();

    // Probabilistic cleanup to remove expired entries and prevent memory leaks
    if (Math.random() < 0.01) {
      this.cleanup(now);
    }

    const info = this.requests.get(key);

    if (!info || now > info.resetTime) {
      // New window or expired window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (info.count >= this.limit) {
      // Limit exceeded
      return false;
    }

    // Increment count
    info.count++;
    return true;
  }

  private cleanup(now: number) {
    for (const [key, info] of Array.from(this.requests.entries())) {
      if (now > info.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Persistent, serverless-safe rate limiter backed by MongoDB.
 * Works correctly across multiple processes and serverless function invocations.
 *
 * Each rate-limit window is stored as a single document identified by a
 * compound key: `purpose:key:windowStart`. MongoDB's TTL index on `resetAt`
 * cleans up expired windows automatically.
 */
export class MongoRateLimiter {
  private windowMs: number;
  private limit: number;
  private purpose: string;

  constructor(purpose: string, windowMs: number, limit: number) {
    this.purpose = purpose;
    this.windowMs = windowMs;
    this.limit = limit;
  }

  async check(key: string): Promise<boolean> {
    const result = await this.checkDetailed(key);
    return result.allowed;
  }

  async checkDetailed(key: string): Promise<RateLimitResult> {
    const now = Date.now();

    // Align to fixed window boundaries so all requests in the same window
    // share the same document.
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const windowId = `${this.purpose}:${key}:${windowStart}`;
    const resetAt = new Date(windowStart + this.windowMs);
    const retryAfterSeconds = Math.max(0, Math.ceil((resetAt.getTime() - now) / 1000));

    try {
      await dbConnect();

      const doc = await RateLimitEntry.findOneAndUpdate(
        { windowId },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            windowId,
            key,
            purpose: this.purpose,
            resetAt,
          },
        },
        { upsert: true, new: true },
      );
      const count = Number(doc?.count ?? 0);

      return {
        allowed: count <= this.limit,
        limit: this.limit,
        remaining: Math.max(0, this.limit - count),
        resetAt,
        retryAfterSeconds,
      };
    } catch (error) {
      console.warn(`Rate limit storage failed open for purpose "${this.purpose}".`, error);
      return {
        allowed: true,
        limit: this.limit,
        remaining: this.limit,
        resetAt,
        retryAfterSeconds,
      };
    }
  }
}

export function buildRateLimitKey(
  req: Request,
  options: {
    userId?: string | null;
    route?: string;
    scope?: 'ip' | 'user' | 'ip+route' | 'user+route';
  } = {},
): string {
  const scope = options.scope ?? 'ip';
  const ipKey = `ip:${getClientIp(req)}`;
  const userKey = options.userId ? `user:${options.userId}` : ipKey;

  if (scope === 'user') return userKey;
  if (scope === 'ip+route') return `route:${options.route ?? new URL(req.url).pathname}:${ipKey}`;
  if (scope === 'user+route') return `route:${options.route ?? new URL(req.url).pathname}:${userKey}`;

  return ipKey;
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'Retry-After': String(result.retryAfterSeconds),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt.getTime() / 1000)),
  };
}

export function rateLimitResponse(message: string, result: RateLimitResult): NextResponse {
  return NextResponse.json({ msg: message }, { status: 429, headers: rateLimitHeaders(result) });
}
