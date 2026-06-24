export function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeError = error as { code?: unknown; name?: unknown };
  return maybeError.code === 11000;
}
