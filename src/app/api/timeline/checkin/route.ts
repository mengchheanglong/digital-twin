import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import CheckIn from '@/lib/models/CheckIn';
import { unauthorized, serverError } from '@/lib/api-response';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export interface TimelineDay {
  date: string; // ISO date string "YYYY-MM-DD"
  dayKey: string;
  percentage: number;
  overallScore: number;
  ratings: number[];
  hasData: boolean;
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    // Fetch last 90 days of check-ins
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 89);
    cutoff.setHours(0, 0, 0, 0);

    const checkIns = await CheckIn.find({
      userId: new mongoose.Types.ObjectId(user.id),
      date: { $gte: cutoff },
    })
      .sort({ date: -1 })
      .lean();

    // Build a map keyed by dayKey for O(1) lookup
    const byDayKey: Record<string, { percentage: number; overallScore: number; ratings: number[] }> = {};
    for (const c of checkIns) {
      byDayKey[c.dayKey] = {
        percentage: c.percentage,
        overallScore: c.overallScore,
        ratings: Array.isArray(c.ratings) ? c.ratings : [],
      };
    }

    // Generate all 90 days in order (oldest → newest)
    const days: TimelineDay[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0); // noon to avoid TZ edge cases
      const isoDate = d.toISOString().slice(0, 10);
      const dayKey = isoDate; // YYYY-MM-DD

      const entry = byDayKey[dayKey];
      days.push({
        date: isoDate,
        dayKey,
        percentage: entry?.percentage ?? 0,
        overallScore: entry?.overallScore ?? 0,
        ratings: entry?.ratings ?? [],
        hasData: !!entry,
      });
    }

    return NextResponse.json({ days });
  } catch (error) {
    return serverError(error, 'Error fetching timeline check-ins');
  }
}
