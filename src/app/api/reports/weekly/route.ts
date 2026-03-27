import { NextResponse } from 'next/server';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { generateWeeklyReport } from '@/lib/reports/weekly';
import { unauthorized, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await verifyTokenWithRevocation(req);
    if (!user) return unauthorized();

    const report = await generateWeeklyReport(user.id);
    return NextResponse.json({ report });
  } catch (error) {
    return serverError(error, 'Error generating weekly report');
  }
}
