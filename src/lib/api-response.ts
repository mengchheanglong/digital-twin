import { NextResponse } from 'next/server';

/**
 * Returns a JSON error response with a standardized format.
 * @param msg Error message
 * @param status HTTP status code (default: 400)
 */
export function errorResponse(msg: string, status: number = 400) {
  return NextResponse.json({ msg }, { status });
}

/**
 * Returns a JSON success response with a standardized format.
 * @param msg Success message
 * @param data Optional data payload
 * @param status HTTP status code (default: 200)
 */
export function successResponse(msg: string, data: unknown = null, status: number = 200) {
  return NextResponse.json({ msg, data }, { status });
}

/**
 * Returns a 400 Bad Request response.
 * @param msg Error message
 */
export function badRequest(msg: string) {
  return errorResponse(msg, 400);
}

/**
 * Returns a 401 Unauthorized response.
 * @param msg Error message (default: 'No token, authorization denied.')
 */
export function unauthorized(msg: string = 'No token, authorization denied.') {
  return errorResponse(msg, 401);
}

/**
 * Returns a 403 Forbidden response.
 * @param msg Error message (default: 'Forbidden.')
 */
export function forbidden(msg: string = 'Forbidden.') {
  return errorResponse(msg, 403);
}

/**
 * Returns a 404 Not Found response.
 * @param msg Error message (default: 'Not found.')
 */
export function notFound(msg: string = 'Not found.') {
  return errorResponse(msg, 404);
}

/**
 * Returns a 409 Conflict response.
 * @param msg Error message (default: 'Conflict.')
 */
export function conflict(msg: string = 'Conflict.') {
  return errorResponse(msg, 409);
}

/**
 * Logs the error and returns a 500 Server Error response.
 * @param error The error object
 * @param context Log context message (default: 'Server error')
 * @param userMsg User-facing message (default: 'Server error.')
 */
export function serverError(error: unknown, context: string = 'Server error', userMsg: string = 'Server error.') {
  console.error(`${context}:`, error);
  return errorResponse(userMsg, 500);
}

/**
 * Returns a 429 Too Many Requests response.
 * @param msg Error message (default: 'Too many requests.')
 */
export function tooManyRequests(msg: string = 'Too many requests.') {
  return errorResponse(msg, 429);
}
