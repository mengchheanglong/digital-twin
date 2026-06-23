import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, notFound, serverError } from '@/lib/api-response';
import User from '@/lib/models/User';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';

export const dynamic = 'force-dynamic';

function isNewDay(lastResetDate: Date | null, currentTime: Date, tz: string): boolean {
  if (!lastResetDate) {
    return true;
  }
  
  const lastResetLocal = lastResetDate.toLocaleDateString('en-US', { timeZone: tz });
  const currentLocal = currentTime.toLocaleDateString('en-US', { timeZone: tz });
  return lastResetLocal !== currentLocal;
}

/**
 * POST /api/quest/reset
 * 
 * Checks if a new day has started in the user's timezone and performs daily quest reset:
 * 1. Archive completed daily quests to QuestLog (if not already logged)
 * 2. Delete completed daily quests with exhausted recurrence
 * 3. Reset repeatable and incomplete daily quests
 * 4. Update lastQuestResetDate to current time
 */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized();
    }

    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      return notFound('User not found.');
    }

    const timezone = userDoc.timezone || 'Asia/Bangkok';
    const now = new Date();
    const lastResetDate = userDoc.lastQuestResetDate;

    if (!isNewDay(lastResetDate, now, timezone)) {
      return NextResponse.json({
        msg: 'No reset needed - same day.',
        reset: false,
      });
    }

    const completedDailyQuests = await Quest.find({
      userId: user.id,
      duration: 'daily',
      completed: true,
    });

    if (completedDailyQuests.length > 0) {
      const bulkOps = completedDailyQuests.map((quest) => ({
        updateOne: {
          filter: { userId: user.id, questId: quest._id },
          update: {
            $set: {
              goal: quest.goal,
              duration: quest.duration,
              progress: quest.progress ?? 100,
              completedDate: quest.completedDate || now,
              createdDate: quest.date,
              isDeleted: false,
              deletedDate: null,
            },
          },
          upsert: true,
        },
      }));

      await QuestLog.bulkWrite(bulkOps);
    }

    const deleteNonRepeatableResult = await Quest.deleteMany({
      userId: user.id,
      duration: 'daily',
      completed: true,
      $or: [
        { recurrencesLeft: 0 },
        { recurrencesLeft: 1 },
      ],
    });

    const resetCompletedResult = await Quest.updateMany(
      {
        userId: user.id,
        duration: 'daily',
        completed: true,
        $or: [
          { recurrencesLeft: null },
          { recurrencesLeft: { $exists: false } },
          { recurrencesLeft: { $gt: 1 } },
        ],
      },
      {
        $set: { progress: 0, completed: false, completedDate: null },
      }
    );

    const resetResult = await Quest.updateMany(
      {
        userId: user.id,
        duration: 'daily',
        completed: false,
      },
      {
        $set: { progress: 0 },
      }
    );

    await User.findByIdAndUpdate(user.id, {
      lastQuestResetDate: now,
    });

    return NextResponse.json({
      msg: 'Daily quest reset completed.',
      reset: true,
      stats: {
        totalDeleted: deleteNonRepeatableResult.deletedCount,
        completedReset: resetCompletedResult.modifiedCount,
        incompleteReset: resetResult.modifiedCount,
      },
    });
  } catch (error) {
    return serverError(error, 'Quest reset error');
  }
}
