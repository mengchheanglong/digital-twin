import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { signToken } from '@/lib/auth';
import { validatePassword, validateEmail } from '@/lib/validation';
import { getRequiredXP } from '@/lib/progression';
import User from '@/lib/models/User';
import { badRequest, conflict, serverError, tooManyRequests } from '@/lib/api-response';
import { MongoRateLimiter } from '@/lib/rate-limit';
import { getClientIp, readJsonBody } from '@/lib/request';
import { isDuplicateKeyError } from '@/lib/mongo-errors';

export const dynamic = 'force-dynamic';

// 5 requests per minute per IP, backed by MongoDB so it works across processes.
const registerLimiter = new MongoRateLimiter('register', 60 * 1000, 5);

interface RegisterPayload {
  email?: string;
  password?: string;
}

function buildNameFromEmail(email: string): string {
  const prefix = email.split('@')[0] || 'Adventurer';
  const normalized = prefix.replace(/[._-]+/g, ' ').trim();
  if (!normalized) return 'Adventurer';

  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .slice(0, 40);
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    if (!(await registerLimiter.check(ip))) {
      return tooManyRequests('Too many registration attempts. Please try again later.');
    }

    await dbConnect();

    const parsed = await readJsonBody<RegisterPayload>(req);
    if (parsed.ok === false) return parsed.response;

    const body = parsed.data;
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return badRequest('Email and password are required.');
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json({ msg: emailValidation.message }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return badRequest(passwordValidation.message);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return conflict('User already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const name = buildNameFromEmail(email);

    const newUser = new User({
      email,
      password: hashedPassword,
      name,
      level: 1,
      currentXP: 0,
      requiredXP: getRequiredXP(1),
      badges: [],
      joinDate: new Date(),
    });

    try {
      await newUser.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return conflict('User already exists.');
      }
      throw error;
    }

    const token = signToken({ id: newUser.id, email: newUser.email });

    return NextResponse.json(
      {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return serverError(error, 'Register error');
  }
}
