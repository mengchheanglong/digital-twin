import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { normalizeDuration } from '@/lib/progression';

import Quest from '@/lib/models/Quest';
import { badRequest, unauthorized, serverError, tooManyRequests } from '@/lib/api-response';
import { RateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// 20 quest creations per minute per IP
const createQuestLimiter = new RateLimiter(60 * 1000, 20);

interface CreateQuestPayload {
  goal?: string;
  duration?: string;
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (!createQuestLimiter.check(ip)) {
      return tooManyRequests('Too many quest creation requests. Please try again later.');
    }

    await dbConnect();

    const user = verifyToken(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    const body = (await req.json()) as CreateQuestPayload & { recurrences?: number };
    const goal = String(body.goal || '').trim();
    const duration = normalizeDuration(String(body.duration || 'daily'));
    const recurrences = body.recurrences ? Math.max(1, Number(body.recurrences)) : undefined;

    if (!goal) {
      return badRequest('Goal is required.');
    }

    if (goal.length > 100) {
      return badRequest('Goal must be 100 characters or less.');
    }

    const quest = new Quest({
      userId: user.id,
      goal,
      duration,
      progress: 0,
      completed: false,
      completedDate: null,
      recurrencesLeft: recurrences,
      date: new Date(),
    });

    await quest.save();

    return NextResponse.json({
      msg: 'Quest created.',
      quest,
    });
  } catch (error) {
    return serverError(error, 'Create quest error');
  }
}
