import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-response';
import { generateWeeklyPlan } from '@/lib/weekly-plan';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const plan = await generateWeeklyPlan(user.id);

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    return serverError(error, 'Weekly plan generation error');
  }
}
