import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { unauthorized, badRequest, notFound, serverError } from '@/lib/api-response';
import { normalizeDuration, QUEST_XP_REWARD } from '@/lib/progression';
import { adjustUserXP } from '@/lib/user-progress';
import { updateUserInsight } from '@/lib/insight-engine';

import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import UserEvent from '@/lib/models/UserEvent';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized();
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest('Invalid quest id.');
    }

    const quest = await Quest.findOne({ _id: id, userId: user.id });
    if (!quest) {
      return notFound('Quest not found.');
    }

    const nextCompleted = !quest.completed;
    quest.completed = nextCompleted;
    quest.progress = nextCompleted ? 100 : 0;
    quest.completedDate = nextCompleted ? new Date() : null;

    const reward = QUEST_XP_REWARD[normalizeDuration(quest.duration)] || 0;
    
    // Save to QuestLog when completing a quest
    if (nextCompleted) {
      await QuestLog.findOneAndUpdate(
        { userId: user.id, questId: quest._id },
        {
          $set: {
            goal: quest.goal,
            duration: quest.duration,
            progress: 100,
            completedDate: quest.completedDate,
            createdDate: quest.date,
            isDeleted: false,
            deletedDate: null,
          },
        },
        { upsert: true, new: true }
      );

      // Track quest completion event
      await UserEvent.create({
        userId: user._id,
        type: 'quest_completed',
        metadata: {
          category: quest.duration,
        },
      });

      // Update insights with force flag so the completion is reflected immediately
      updateUserInsight(user._id.toString(), { force: true }).catch(console.error);
    }
    
    // Recurring Logic
    if (nextCompleted) {
      const now = new Date();
      let nextDate = new Date(now);
      
      // Determine next start date based on duration
      switch (quest.duration) {
        case 'daily':
          nextDate.setDate(now.getDate() + 1);
          nextDate.setHours(0, 0, 0, 0); // Start of next day
          break;
        case 'weekly':
          nextDate.setDate(now.getDate() + 7);
          nextDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          nextDate.setMonth(now.getMonth() + 1);
          nextDate.setHours(0, 0, 0, 0);
          break;
        case 'yearly':
          nextDate.setFullYear(now.getFullYear() + 1);
          nextDate.setHours(0, 0, 0, 0);
          break;
        default:
          // No recurrence for unknown types, or treat as daily? 
          // Assuming 'one-time' isn't a type here based on IQuest interface, 
          // but if it was, we'd break. The interface says daily/weekly/monthly/yearly.
          // Fallback to daily if valid enum compliance issues, or just break.
          // Let's assume daily fallback for safety if sticking to enum.
           nextDate.setDate(now.getDate() + 1);
           nextDate.setHours(0, 0, 0, 0);
          break;
      }

      // Check if future quest already exists to prevent duplicates
      const existingFutureQuest = await Quest.findOne({
        userId: user.id,
        goal: quest.goal,
        duration: quest.duration,
        date: { $gte: nextDate },
        completed: false
      });

      let shouldDeleteOriginal = false;
      let nextRecurrencesLeft = quest.recurrencesLeft;

      if (!existingFutureQuest) {
        // Handle recurrences
        let shouldCreate = true;

        if (typeof nextRecurrencesLeft === 'number') {
           if (nextRecurrencesLeft > 0) {
             nextRecurrencesLeft -= 1;
             // If this was the last recurrence, mark for deletion
             if (nextRecurrencesLeft === 0) {
               shouldDeleteOriginal = true;
               shouldCreate = false;
             }
           } else {
             shouldCreate = false;
             shouldDeleteOriginal = true; // No more recurrences, delete original
           }
        }

        if (shouldCreate) {
           await Quest.create({
             userId: user.id,
             goal: quest.goal,
             duration: quest.duration,
             date: nextDate,
             progress: 0,
             completed: false,
             recurrencesLeft: nextRecurrencesLeft
           });
         }
       } else {
         // Future quest already exists - only delete if recurrencesLeft === 0
         if (typeof quest.recurrencesLeft === 'number' && quest.recurrencesLeft === 0) {
           shouldDeleteOriginal = true;
         }
       }

      // Delete the original quest if needed
      if (shouldDeleteOriginal) {
        await Quest.findByIdAndDelete(quest._id);
        
        const progression = await adjustUserXP(user.id, reward);
        
        return NextResponse.json({
          msg: 'Quest completed and archived.',
          quest: null, // Quest is deleted
          progression,
          deleted: true,
        });
      }
    }

    const [progression] = await Promise.all([
      adjustUserXP(user.id, nextCompleted ? reward : -reward),
      quest.save(),
    ]);

    return NextResponse.json({
      msg: nextCompleted ? 'Quest completed.' : 'Quest reopened.',
      quest,
      progression,
    });
  } catch (error) {
    return serverError(error, 'Toggle completion error');
  }
}
