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

function normalizeQuestGoal(goal: string): string {
  return goal.trim().replace(/\s+/g, ' ').toLowerCase();
}

function questRepeatKey(quest: { goal: string; duration: string }): string {
  return `${quest.duration}:${normalizeQuestGoal(quest.goal)}`;
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

    const activeDailyQuests = await Quest.find({
      userId: user.id,
      duration: 'daily',
      completed: false,
    });

    const activeDailyKeys = new Set(activeDailyQuests.map(questRepeatKey));
    const completedDuplicateIds = completedDailyQuests
      .filter((quest) => activeDailyKeys.has(questRepeatKey(quest)))
      .map((quest) => quest._id);

    const deleteConditions: Record<string, unknown>[] = [
      { recurrencesLeft: 0 },
      { recurrencesLeft: 1 },
    ];

    if (completedDuplicateIds.length > 0) {
      deleteConditions.push({ _id: { $in: completedDuplicateIds } });
    }

    const deleteNonRepeatableResult = await Quest.deleteMany({
      userId: user.id,
      duration: 'daily',
      completed: true,
      $or: deleteConditions,
    });

    const resetInfiniteCompletedResult = await Quest.updateMany(
      {
        userId: user.id,
        duration: 'daily',
        completed: true,
        $or: [
          { recurrencesLeft: null },
          { recurrencesLeft: { $exists: false } },
        ],
      },
      {
        $set: { progress: 0, completed: false, completedDate: null },
      }
    );

    const resetLimitedCompletedResult = await Quest.updateMany(
      {
        userId: user.id,
        duration: 'daily',
        completed: true,
        recurrencesLeft: { $gt: 1 },
      },
      {
        $set: { progress: 0, completed: false, completedDate: null },
        $inc: { recurrencesLeft: -1 },
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
        completedReset:
          resetInfiniteCompletedResult.modifiedCount + resetLimitedCompletedResult.modifiedCount,
        incompleteReset: resetResult.modifiedCount,
      },
    });
  } catch (error) {
    return serverError(error, 'Quest reset error');
  }
}
