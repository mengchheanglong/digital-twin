import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { normalizeDuration } from '@/lib/progression';

import Quest from '@/lib/models/Quest';
import { badRequest, unauthorized, serverError, tooManyRequests } from '@/lib/api-response';
import { MongoRateLimiter } from '@/lib/rate-limit';
import { getClientIp, readJsonBody } from '@/lib/request';

export const dynamic = 'force-dynamic';

// 20 quest creations per minute per IP
const createQuestLimiter = new MongoRateLimiter('quest-create', 60 * 1000, 20);

interface CreateQuestPayload {
  goal?: string;
  duration?: string;
  recurrences?: unknown;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    if (!(await createQuestLimiter.check(ip))) {
      return tooManyRequests('Too many quest creation requests. Please try again later.');
    }

    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    const parsed = await readJsonBody<CreateQuestPayload>(req);
    if (parsed.ok === false) return parsed.response;

    const body = parsed.data;
    const goal = String(body.goal || '').trim();
    const duration = normalizeDuration(String(body.duration || 'daily'));
    let recurrences: number | undefined;
    if (body.recurrences !== undefined) {
      const requestedRecurrences = Number(body.recurrences);
      if (
        !Number.isInteger(requestedRecurrences) ||
        requestedRecurrences < 1 ||
        requestedRecurrences > 365
      ) {
        return badRequest('Recurrences must be an integer between 1 and 365.');
      }
      recurrences = requestedRecurrences;
    }

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
