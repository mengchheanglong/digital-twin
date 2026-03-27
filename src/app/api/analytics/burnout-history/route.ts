import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import BurnoutHistory from '@/lib/models/BurnoutHistory';
import { computeBurnoutRisk, toBurnoutStage } from '@/lib/analytics/burnout';
import { getDayKey } from '@/lib/progression';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);

    const history = await BurnoutHistory.find({ userId: uid })
      .select('stage riskScore dayKey recordedAt')
      .sort({ recordedAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({ success: true, history });
  } catch (error) {
    return serverError(error, 'Burnout history error');
  }
}

/** Record today's burnout stage (called automatically by the burnout GET route) */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const uid = new mongoose.Types.ObjectId(user.id);
    const dayKey = getDayKey(new Date());

    // Avoid duplicate entries for the same day
    const existing = await BurnoutHistory.findOne({ userId: uid, dayKey }).lean();
    if (existing) {
      return NextResponse.json({ success: true, message: 'Already recorded today.' });
    }

    const report = await computeBurnoutRisk(user.id);
    const stage = toBurnoutStage(report.riskScore);

    await BurnoutHistory.create({
      userId: uid,
      stage: stage.stage,
      riskScore: report.riskScore,
      dayKey,
      recordedAt: new Date(),
    });

    return NextResponse.json({ success: true, stage: stage.stage, riskScore: report.riskScore });
  } catch (error) {
    return serverError(error, 'Record burnout history error');
  }
}
