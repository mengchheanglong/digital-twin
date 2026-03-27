import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import QuestLog from '@/lib/models/QuestLog';
import { unauthorized, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    // Fetch all quest logs for the user, sorted by completion date (newest first)
    const questLogs = await QuestLog.find({ userId: user.id })
      .sort({ completedDate: -1 })
      .lean();

    // Transform the data for the frontend
    const formattedLogs = questLogs.map((log) => ({
      id: log._id.toString(),
      questId: log.questId.toString(),
      goal: log.goal,
      duration: log.duration,
      progress: log.progress,
      completedDate: log.completedDate,
      createdDate: log.createdDate,
      deletedDate: log.deletedDate,
      isDeleted: log.isDeleted,
    }));

    return NextResponse.json({ questLogs: formattedLogs });
  } catch (error) {
    return serverError(error, 'Fetch quest log error');
  }
}
