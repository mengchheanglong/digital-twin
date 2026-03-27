import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, notFound, serverError } from '@/lib/api-response';
import User from '@/lib/models/User';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';

export const dynamic = 'force-dynamic';

/**
 * Helper function to check if a new day has started in the user's timezone
 */
function isNewDay(lastResetDate: Date | null, currentTime: Date, tz: string): boolean {
  if (!lastResetDate) {
    return true; // Never reset before, so it's a "new day"
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
 * 2. Delete completed daily quests
 * 3. Reset incomplete daily quests (set completed = false, progress = 0)
 * 4. Update lastQuestResetDate to current time
 */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized();
    }

    // Get user with timezone info
    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      return notFound('User not found.');
    }

    const timezone = userDoc.timezone || 'Asia/Bangkok';
    const now = new Date();
    const lastResetDate = userDoc.lastQuestResetDate;

    // Check if a new day has started
    if (!isNewDay(lastResetDate, now, timezone)) {
      return NextResponse.json({
        msg: 'No reset needed - same day.',
        reset: false,
      });
    }

    // Perform daily reset operations
    
    // 1. Find all completed daily quests
    const completedDailyQuests = await Quest.find({
      userId: user.id,
      duration: 'daily',
      completed: true,
    });

    // 2. Archive to QuestLog if not already there
    for (const quest of completedDailyQuests) {
      await QuestLog.findOneAndUpdate(
        { userId: user.id, questId: quest._id },
        {
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
        { upsert: true, new: true }
      );
    }

    // 3. Delete completed daily quests that have no recurrences left (recurrencesLeft === 0)
    // Only delete where recurrencesLeft === 0 (explicitly zero, not undefined/null)
    // undefined/null means infinite recurrence - these should be reset, not deleted
    const deleteResult = await Quest.deleteMany({
      userId: user.id,
      duration: 'daily',
      completed: true,
      recurrencesLeft: 0,
    });

    // 3b. Delete completed daily quests with exactly 1 recurrence left (recurrencesLeft === 1)
    // These are quests where the user wanted to repeat only once - after completion, they should be deleted
    const deleteOneTimeResult = await Quest.deleteMany({
      userId: user.id,
      duration: 'daily',
      completed: true,
      recurrencesLeft: 1,
    });

    // 3c. Reset completed daily quests with infinite recurrence (recurrencesLeft is undefined/null or > 1)
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

    // 4. Reset incomplete daily quests
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

    // 5. Delete non-repeatable completed quests (recurrencesLeft === 0 or 1)
    // recurrencesLeft === 0 means explicitly 0 repeats left
    // recurrencesLeft === 1 means one-time quest that was just completed
    const deleteNonRepeatableResult = await Quest.deleteMany({
      userId: user.id,
      completed: true,
      $or: [
        { recurrencesLeft: 0 },
        { recurrencesLeft: 1 },
      ],
    });

    // 6. Update last reset date
    await User.findByIdAndUpdate(user.id, {
      lastQuestResetDate: now,
    });

    return NextResponse.json({
      msg: 'Daily quest reset completed.',
      reset: true,
      stats: {
        completedDeleted: deleteResult.deletedCount,
        completedReset: resetCompletedResult.modifiedCount,
        incompleteReset: resetResult.modifiedCount,
        nonRepeatableDeleted: deleteNonRepeatableResult.deletedCount,
      },
    });
  } catch (error) {
    return serverError(error, 'Quest reset error');
  }
}