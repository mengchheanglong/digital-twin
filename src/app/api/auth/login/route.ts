import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { signToken } from '@/lib/auth';
import User from '@/lib/models/User';
import { unauthorized, serverError } from '@/lib/api-response';
import { MongoRateLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { getClientIp, readJsonBody, requiredString, validateFields } from '@/lib/request';

export const dynamic = 'force-dynamic';

// 5 requests per minute per IP
const loginLimiter = new MongoRateLimiter('login', 60 * 1000, 5);

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    const rateLimit = await loginLimiter.checkDetailed(ip);
    if (!rateLimit.allowed) {
      return rateLimitResponse('Too many login attempts. Please try again later.', rateLimit);
    }

    await dbConnect();

    const parsed = await readJsonBody<Record<string, unknown>>(req);
    if (parsed.ok === false) return parsed.response;

    const fields = validateFields(parsed.data, {
      email: requiredString('Email', { message: 'Email and password are required.' }),
      password: requiredString('Password', { message: 'Email and password are required.' }),
    });
    if (fields.ok === false) return fields.response;

    const email = fields.data.email.toLowerCase();
    const password = fields.data.password;

    const user = await User.findOne({ email });
    if (!user) {
      return unauthorized('Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return unauthorized('Invalid credentials.');
    }

    const token = signToken({ id: user.id, email: user.email });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return serverError(error, 'Login error');
  }
}
