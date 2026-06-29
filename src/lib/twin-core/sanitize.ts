const DEFAULT_MAX_STRING_LENGTH = 160;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi;
const SECRET_ASSIGNMENT_PATTERN = /\b(api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|reset[_-]?token|session[_-]?token|id[_-]?token|token|jwt|password|passwd|secret)\s*[:=]\s*[^\s,;&#]+/gi;
const SECRET_QUERY_PATTERN = /([?&](?:api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|reset[_-]?token|session[_-]?token|id[_-]?token|token|jwt|password|passwd|secret)=)[^&#\s]+/gi;
const COMMON_SECRET_PREFIX_PATTERN = /\b(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g;
const LONG_HEX_TOKEN_PATTERN = /\b[A-Fa-f0-9]{32,}\b/g;
const LONG_MIXED_TOKEN_PATTERN = /\b(?=[A-Za-z0-9_-]{40,}\b)(?=[A-Za-z0-9_-]*[A-Za-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g;

export function redactSensitiveText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(JWT_PATTERN, '[redacted-token]')
    .replace(BEARER_TOKEN_PATTERN, 'Bearer [redacted-secret]')
    .replace(SECRET_QUERY_PATTERN, '$1[redacted-secret]')
    .replace(SECRET_ASSIGNMENT_PATTERN, (_match, key: string) => `${key}=[redacted-secret]`)
    .replace(COMMON_SECRET_PREFIX_PATTERN, '[redacted-secret]')
    .replace(LONG_HEX_TOKEN_PATTERN, '[redacted-token]')
    .replace(LONG_MIXED_TOKEN_PATTERN, '[redacted-token]');
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function roundNumber(value: unknown, decimals: number = 0): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;

  const precision = Math.max(0, Math.min(6, Math.floor(decimals)));
  const factor = 10 ** precision;
  return Math.round(numeric * factor) / factor;
}

export function sanitizeText(value: unknown, maxLength: number = DEFAULT_MAX_STRING_LENGTH): string {
  if (value === null || value === undefined) return '';

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const redacted = redactSensitiveText(normalized).trim();
  if (!redacted) return '';

  const safeMax = Math.max(0, Math.floor(maxLength));
  return redacted.slice(0, safeMax);
}

export function sanitizeStringArray(
  values: unknown,
  maxItems: number,
  maxLength: number = DEFAULT_MAX_STRING_LENGTH,
): string[] {
  if (!Array.isArray(values)) return [];

  const output: string[] = [];
  const seen = new Set<string>();
  const safeMaxItems = Math.max(0, Math.floor(maxItems));

  for (const value of values) {
    const text = sanitizeText(value, maxLength);
    if (!text || seen.has(text)) continue;

    output.push(text);
    seen.add(text);

    if (output.length >= safeMaxItems) break;
  }

  return output;
}
