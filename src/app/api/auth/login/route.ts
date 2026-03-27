import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { signToken } from '@/lib/auth';
import User from '@/lib/models/User';
import { badRequest, unauthorized, serverError, tooManyRequests } from '@/lib/api-response';
import { MongoRateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface LoginPayload {
  email?: string;
  password?: string;
}

// 5 requests per minute per IP
const loginLimiter = new MongoRateLimiter('login', 60 * 1000, 5);

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (!(await loginLimiter.check(ip))) {
      return tooManyRequests('Too many login attempts. Please try again later.');
    }

    await dbConnect();

    const body = (await req.json()) as LoginPayload;
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return badRequest('Email and password are required.');
    }

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
