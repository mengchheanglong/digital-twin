import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError, badRequest, notFound } from '@/lib/api-response';
import CheckIn from '@/lib/models/CheckIn';
import LifeEvent from '@/lib/models/LifeEvent';

export const dynamic = 'force-dynamic';

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

interface DimensionWindow {
  energy: number;
  focus: number;
  stressControl: number;
  socialConnection: number;
  optimism: number;
  percentage: number;
  sampleCount: number;
}

async function getWindowAvg(userId: mongoose.Types.ObjectId, from: Date, to: Date): Promise<DimensionWindow> {
  const checkIns = await CheckIn.find({
    userId,
    date: { $gte: from, $lte: to },
    checkInType: { $ne: 'micro' },
  })
    .select('ratings percentage')
    .lean();

  if (!checkIns.length) {
    return { energy: 0, focus: 0, stressControl: 0, socialConnection: 0, optimism: 0, percentage: 0, sampleCount: 0 };
  }

  const sums = [0, 0, 0, 0, 0];
  let percentageSum = 0;

  for (const c of checkIns) {
    percentageSum += c.percentage as number;
    if (Array.isArray(c.ratings) && c.ratings.length === 5) {
      for (let i = 0; i < 5; i++) sums[i] += (c.ratings as number[])[i];
    }
  }

  const n = checkIns.length;
  const round = (v: number) => Math.round((v / n) * 10) / 10;

  return {
    energy: round(sums[0]),
    focus: round(sums[1]),
    stressControl: round(sums[2]),
    socialConnection: round(sums[3]),
    optimism: round(sums[4]),
    percentage: Math.round(percentageSum / n),
    sampleCount: n,
  };
}

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const windowDays = Math.min(30, Math.max(3, Number(searchParams.get('windowDays') ?? 14)));

    if (!eventId) return badRequest('eventId is required');

    const event = await LifeEvent.findOne({ _id: eventId, userId: uid }).lean();
    if (!event) return notFound('Life event not found.');

    const eventDate = new Date(event.date as Date);
    const before = await getWindowAvg(uid, addDays(eventDate, -windowDays), addDays(eventDate, -1));
    const after = await getWindowAvg(uid, addDays(eventDate, 1), addDays(eventDate, windowDays));

    const impact = {
      percentageChange: before.sampleCount && after.sampleCount
        ? after.percentage - before.percentage
        : null,
      energyChange: before.sampleCount && after.sampleCount
        ? Math.round((after.energy - before.energy) * 10) / 10
        : null,
      focusChange: before.sampleCount && after.sampleCount
        ? Math.round((after.focus - before.focus) * 10) / 10
        : null,
      stressControlChange: before.sampleCount && after.sampleCount
        ? Math.round((after.stressControl - before.stressControl) * 10) / 10
        : null,
      socialConnectionChange: before.sampleCount && after.sampleCount
        ? Math.round((after.socialConnection - before.socialConnection) * 10) / 10
        : null,
      optimismChange: before.sampleCount && after.sampleCount
        ? Math.round((after.optimism - before.optimism) * 10) / 10
        : null,
    };

    return NextResponse.json({
      success: true,
      event,
      before,
      after,
      impact,
      windowDays,
    });
  } catch (error) {
    return serverError(error, 'Life event impact error');
  }
}
