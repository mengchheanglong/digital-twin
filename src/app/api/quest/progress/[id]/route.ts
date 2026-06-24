import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { normalizeDuration, QUEST_XP_REWARD } from '@/lib/progression';
import { adjustUserXP } from '@/lib/user-progress';
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api-response';
import { readJsonBody } from '@/lib/request';

import Quest from '@/lib/models/Quest';

export const dynamic = 'force-dynamic';

interface UpdateProgressPayload {
  progress?: number;
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest('Invalid quest id.');
    }

    const parsed = await readJsonBody<UpdateProgressPayload>(req);
    if (parsed.ok === false) return parsed.response;

    const body = parsed.data;
    const progress = Number(body.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return badRequest('Progress must be a number between 0 and 100.');
    }

    const roundedProgress = Math.round(progress);
    const nextCompleted = roundedProgress >= 100;
    const previousQuest = await Quest.findOneAndUpdate(
      { _id: id, userId: user.id },
      {
        $set: {
          progress: roundedProgress,
          completed: nextCompleted,
          completedDate: nextCompleted ? new Date() : null,
        },
      },
      { new: false },
    );

    if (!previousQuest) {
      return notFound('Quest not found.');
    }

    let progression = null;
    if (Boolean(previousQuest.completed) !== nextCompleted) {
      const reward = QUEST_XP_REWARD[normalizeDuration(previousQuest.duration)] || 0;
      progression = await adjustUserXP(user.id, nextCompleted ? reward : -reward);
    }

    const quest = await Quest.findOne({ _id: id, userId: user.id });

    return NextResponse.json({
      msg: 'Progress updated.',
      quest,
      progression,
    });
  } catch (error) {
    return serverError(error, 'Update progress error');
  }
}

