import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import { computeHabitSynergies } from '@/lib/analytics/synergy';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const report = await computeHabitSynergies(user.id);

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return serverError(error, 'Habit synergy error');
  }
}
