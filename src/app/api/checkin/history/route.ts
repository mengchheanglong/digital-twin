import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import CheckIn from '@/lib/models/CheckIn';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return NextResponse.json({ msg: 'No token, authorization denied.' }, { status: 401 });
    }

    const history = await CheckIn.find({ userId: user.id })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({
      history: history.map((entry) => ({
        id: String(entry._id),
        date: entry.date,
        ratings: entry.ratings,
        overallScore: entry.overallScore,
        percentage: entry.percentage,
      })),
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json({ msg: 'Server error.' }, { status: 500 });
  }
}
