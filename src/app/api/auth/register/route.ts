import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { signToken } from '@/lib/auth';
import { validatePassword, validateEmail } from '@/lib/validation';
import { getRequiredXP } from '@/lib/progression';
import User from '@/lib/models/User';
import { badRequest, conflict, serverError } from '@/lib/api-response';
import { MongoRateLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { getClientIp, readJsonBody, requiredString, validateFields } from '@/lib/request';
import { isDuplicateKeyError } from '@/lib/mongo-errors';

export const dynamic = 'force-dynamic';

// 5 requests per minute per IP, backed by MongoDB so it works across processes.
const registerLimiter = new MongoRateLimiter('register', 60 * 1000, 5);

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

    const rateLimit = await registerLimiter.checkDetailed(ip);
    if (!rateLimit.allowed) {
      return rateLimitResponse('Too many registration attempts. Please try again later.', rateLimit);
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
