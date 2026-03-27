import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import Quest from '@/lib/models/Quest';
import { unauthorized, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    const { searchParams } = new URL(req.url);

    const paramLimit = parseInt(searchParams.get('limit') || '1000', 10);
    const limit = isNaN(paramLimit) || paramLimit < 1 ? 1000 : Math.min(paramLimit, 1000);

    const paramSkip = parseInt(searchParams.get('skip') || '0', 10);
    const skip = isNaN(paramSkip) || paramSkip < 0 ? 0 : paramSkip;

    const now = new Date();
    const quests = await Quest.find({ 
      userId: user.id,
      date: { $lte: now } // Only show quests that are started or active (past/present)
    })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .select({
        goal: 1,
        duration: 1,
        progress: 1,
        completed: 1,
        date: 1,
        completedDate: 1,
        recurrencesLeft: 1,
        ratings: { $slice: 1 },
      })
      .lean();

    return NextResponse.json(
      quests.map((quest) => ({
        ...quest,
        _id: String(quest._id),
        progress: quest.progress ?? quest.ratings?.[0] ?? 0,
      })),
    );
  } catch (error) {
    return serverError(error, 'Fetch quests error', 'Failed to fetch quests.');
  }
}
