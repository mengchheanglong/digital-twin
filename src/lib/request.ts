import { badRequest } from './api-response';
import type { NextResponse } from 'next/server';

export type JsonParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string };
export type Validator<T> = (value: unknown) => FieldResult<T>;

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

interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  trim?: boolean;
  message?: string;
}

function normalizeString(value: unknown, trim: boolean): string | null {
  if (typeof value !== 'string') return null;
  return trim ? value.trim() : value;
}

function validateStringLength(
  fieldName: string,
  value: string,
  options: StringValidationOptions,
): FieldResult<string> {
  if (options.minLength !== undefined && value.length < options.minLength) {
    return {
      ok: false,
      message: `${fieldName} must be at least ${options.minLength} characters.`,
    };
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return {
      ok: false,
      message: `${fieldName} must be at most ${options.maxLength} characters.`,
    };
  }

  return { ok: true, value };
}

export function requiredString(
  fieldName: string,
  options: StringValidationOptions = {},
): Validator<string> {
  return (value: unknown) => {
    const normalized = normalizeString(value, options.trim ?? true);
    if (normalized === null || normalized.length === 0) {
      return { ok: false, message: options.message ?? `${fieldName} is required.` };
    }

    return validateStringLength(fieldName, normalized, options);
  };
}

export function optionalString(
  fieldName: string,
  options: StringValidationOptions = {},
): Validator<string | undefined> {
  return (value: unknown) => {
    if (value === null || value === undefined) {
      return { ok: true, value: undefined };
    }

    const normalized = normalizeString(value, options.trim ?? true);
    if (normalized === null) {
      return { ok: false, message: `${fieldName} must be a string.` };
    }

    return validateStringLength(fieldName, normalized, options);
  };
}

export function boundedNumber(
  fieldName: string,
  options: { min: number; max: number; integer?: boolean },
): Validator<number> {
  return (value: unknown) => {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed)) {
      return { ok: false, message: `${fieldName} must be a number.` };
    }

    if (options.integer === true && !Number.isInteger(parsed)) {
      return { ok: false, message: `${fieldName} must be an integer.` };
    }

    if (parsed < options.min || parsed > options.max) {
      return { ok: false, message: `${fieldName} must be between ${options.min} and ${options.max}.` };
    }

    return { ok: true, value: parsed };
  };
}

export function oneOf<const T extends readonly [string, ...string[]]>(
  fieldName: string,
  values: T,
): Validator<T[number]> {
  return (value: unknown) => {
    if (typeof value === 'string' && values.includes(value)) {
      return { ok: true, value };
    }

    return { ok: false, message: `${fieldName} must be one of: ${values.join(', ')}.` };
  };
}

type Schema = Record<string, Validator<unknown>>;
type InferSchemaData<TSchema extends Schema> = {
  [K in keyof TSchema]: TSchema[K] extends Validator<infer TValue> ? TValue : never;
};

export function validateFields<TSchema extends Schema>(
  body: Record<string, unknown>,
  schema: TSchema,
): { ok: true; data: InferSchemaData<TSchema> } | { ok: false; response: NextResponse } {
  const data: Partial<InferSchemaData<TSchema>> = {};

  for (const key of Object.keys(schema) as Array<keyof TSchema>) {
    const result = schema[key](body[key as string]);
    if (result.ok === false) {
      return { ok: false, response: badRequest(result.message) };
    }
    data[key] = result.value as InferSchemaData<TSchema>[typeof key];
  }

  return { ok: true, data: data as InferSchemaData<TSchema> };
}
