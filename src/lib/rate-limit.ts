import dbConnect from './db';
import RateLimitEntry from './models/RateLimitEntry';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

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
    await dbConnect();

    const now = Date.now();
    // Align to fixed window boundaries so all requests in the same window
    // share the same document.
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const windowId = `${this.purpose}:${key}:${windowStart}`;
    const resetAt = new Date(windowStart + this.windowMs);

    const doc = await RateLimitEntry.findOneAndUpdate(
      { windowId },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          windowId,
          key,
          purpose: this.purpose,
          resetAt,
          count: 0,
        },
      },
      { upsert: true, new: true },
    );

    return doc.count <= this.limit;
  }
}
