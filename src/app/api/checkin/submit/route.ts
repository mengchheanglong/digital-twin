import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { getDayKeyTz } from '@/lib/progression';
import { adjustUserXP } from '@/lib/user-progress';
import { updateUserInsight } from '@/lib/insight-engine';
import { badRequest, unauthorized, serverError, tooManyRequests } from '@/lib/api-response';
import { MongoRateLimiter } from '@/lib/rate-limit';

import CheckIn from '@/lib/models/CheckIn';
import UserEvent from '@/lib/models/UserEvent';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

// 10 check-in submissions per minute per IP
const submitLimiter = new MongoRateLimiter('checkin-submit', 60 * 1000, 10);

interface SubmitPayload {
  ratings?: number[];
}

function isValidRatings(ratings: number[]): boolean {
  return Array.isArray(ratings) && ratings.length === 5 && ratings.every((value) => value >= 1 && value <= 5);
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (!(await submitLimiter.check(ip))) {
      return tooManyRequests('Too many check-in submissions. Please try again later.');
    }

    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    const body = (await req.json()) as SubmitPayload;
    const ratings = Array.isArray(body.ratings) ? body.ratings.map((value) => Number(value)) : [];

    if (!isValidRatings(ratings)) {
      return badRequest('Must provide exactly 5 ratings from 1 to 5.');
    }

    // Use user's stored timezone to determine the correct local calendar day
    const userDoc = await User.findById(user.id).select('timezone').lean();
    const timezone = userDoc?.timezone || 'UTC';
    const dayKey = getDayKeyTz(new Date(), timezone);
    const existingCheckIn = await CheckIn.findOne({ userId: user.id, dayKey });

    if (existingCheckIn) {
      return badRequest('Daily check-in already completed.');
    }

    const overallScore = ratings.reduce((sum, value) => sum + value, 0);
    const maxScore = ratings.length * 5;
    const percentage = Math.round((overallScore / maxScore) * 100);

    const checkIn = new CheckIn({
      userId: user.id,
      ratings,
      overallScore,
      percentage,
      dayKey,
      date: new Date(),
    });

    await checkIn.save();

    // Track check-in event with useful metadata so insight-engine can derive
    // entertainmentRatio, topInterest, and productivityScore from it.
    UserEvent.create({
      userId: user.id,
      type: 'log_added',
      metadata: {
        category: 'checkin',
        topic: 'daily-check-in',
      },
    }).catch((err) => console.error('Failed to create check-in event:', err));

    // Force insight update so the new check-in data is always visible
    // immediately — never silently skipped by the cache guard.
    updateUserInsight(user.id, { force: true }).catch(console.error);

    const progression = await adjustUserXP(user.id, percentage);

    return NextResponse.json({
      msg: 'Check-in submitted.',
      result: {
        totalScore: overallScore,
        maxScore,
        percentage,
      },
      progression,
    });
  } catch (error) {
    return serverError(error, 'Submit check-in error');
  }
}
