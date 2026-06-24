import { badRequest } from './api-response';
import type { NextResponse } from 'next/server';

export type JsonParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

const DEFAULT_MAX_JSON_BYTES = 256 * 1024;

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const firstForwarded = forwarded?.split(',')[0]?.trim();
  if (firstForwarded) return firstForwarded;

  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

export async function readJsonBody<T>(
  req: Request,
  options: { maxBytes?: number } = {},
): Promise<JsonParseResult<T>> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_JSON_BYTES;
  const contentLength = req.headers.get('content-length');

  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { ok: false, response: badRequest('Request body is too large.') };
    }
  }

  try {
    const data = (await req.json()) as T;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, response: badRequest('JSON body must be an object.') };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, response: badRequest('Invalid JSON body.') };
  }
}

export function parseBoundedInt(
  value: string | null,
  options: { defaultValue: number; min: number; max: number },
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return options.defaultValue;
  }

  return Math.min(options.max, Math.max(options.min, parsed));
}
