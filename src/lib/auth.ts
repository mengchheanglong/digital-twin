import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { unauthorized } from './api-response';
import dbConnect from './db';
import User from './models/User';

// Lazy load secret to avoid build-time errors
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined'); 
  }
  return secret;
}

export interface DecodedUser {
  id: string;
  _id?: string;
  email?: string;
  [key: string]: unknown;
}

interface AuthPayload {
  user: DecodedUser;
  iat?: number;
  exp?: number;
}

export function signToken(user: DecodedUser): string {
  return jwt.sign({ user }, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(req: Request): DecodedUser | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
    const payloadUser = decoded.user || ({} as DecodedUser);
    const normalizedId =
      typeof payloadUser.id === 'string' && payloadUser.id.trim()
        ? payloadUser.id.trim()
        : typeof payloadUser._id === 'string' && payloadUser._id.trim()
          ? payloadUser._id.trim()
          : '';

    if (!normalizedId) {
      return null;
    }

    return {
      ...payloadUser,
      id: normalizedId,
      _id: normalizedId,
    };
  } catch {
    return null;
  }
}

/**
 * Like verifyToken but also checks whether the token was issued before the
 * user's most recent password change. If so, the token is treated as revoked.
 *
 * Requires a live DB connection (dbConnect is called internally).
 */
export async function verifyTokenWithRevocation(req: Request): Promise<DecodedUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  let decoded: AuthPayload;
  try {
    decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }

  const payloadUser = decoded.user || ({} as DecodedUser);
  const normalizedId =
    typeof payloadUser.id === 'string' && payloadUser.id.trim()
      ? payloadUser.id.trim()
      : typeof payloadUser._id === 'string' && payloadUser._id.trim()
        ? payloadUser._id.trim()
        : '';

  if (!normalizedId) {
    return null;
  }

  // Check revocation: if the token was issued before the last password change,
  // it is no longer valid.
  try {
    await dbConnect();
    const userDoc = await User.findById(normalizedId, { passwordChangedAt: 1 }).lean();
    if (userDoc?.passwordChangedAt && typeof decoded.iat === 'number') {
      const tokenIssuedMs = decoded.iat * 1000;
      if (tokenIssuedMs < new Date(userDoc.passwordChangedAt).getTime()) {
        return null;
      }
    }
  } catch {
    // If the DB check fails we fail open (don't block valid requests due to
    // transient DB errors) — the JWT signature is still verified above.
  }

  return {
    ...payloadUser,
    id: normalizedId,
    _id: normalizedId,
  };
}

export function withAuth<T = any>(
  handler: (req: Request, context: T, user: DecodedUser) => Promise<NextResponse>
) {
  return async (req: Request, context: T) => {
    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized();
    }
    return handler(req, context, user);
  };
}
