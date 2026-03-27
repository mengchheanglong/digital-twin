import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { badRequest, unauthorized, serverError, tooManyRequests } from '@/lib/api-response';
import { MongoRateLimiter } from '@/lib/rate-limit';
import { getDayKey } from '@/lib/progression';
import CheckIn from '@/lib/models/CheckIn';

export const dynamic = 'force-dynamic';

// 30 micro check-ins per hour per IP
const microLimiter = new MongoRateLimiter('micro-checkin', 60 * 60 * 1000, 30);

interface MicroPayload {
  ratings?: number[];
}

function isValidRatings(ratings: number[]): boolean {
  return Array.isArray(ratings) && ratings.length === 5 && ratings.every((v) => v >= 1 && v <= 5);
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (!(await microLimiter.check(ip))) {
      return tooManyRequests('Too many micro check-ins. Please slow down.');
    }

    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const body = (await req.json()) as MicroPayload;
    const ratings = Array.isArray(body.ratings) ? body.ratings.map((v) => Number(v)) : [];

    if (!isValidRatings(ratings)) {
      return badRequest('Must provide exactly 5 ratings from 1 to 5.');
    }

    const now = new Date();
    const dayKey = getDayKey(now);
    const hour = now.getHours();
    const overallScore = ratings.reduce((s, v) => s + v, 0);
    const percentage = Math.round((overallScore / (ratings.length * 5)) * 100);

    await CheckIn.create({
      userId: user.id,
      ratings,
      overallScore,
      percentage,
      dayKey,
      date: now,
      checkInType: 'micro',
      hour,
    });

    return NextResponse.json({
      msg: 'Micro check-in recorded.',
      result: { overallScore, percentage, hour },
    });
  } catch (error) {
    return serverError(error, 'Micro check-in error');
  }
}
