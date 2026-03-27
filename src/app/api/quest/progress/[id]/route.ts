import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { normalizeDuration, QUEST_XP_REWARD } from '@/lib/progression';
import { adjustUserXP } from '@/lib/user-progress';

import Quest from '@/lib/models/Quest';

export const dynamic = 'force-dynamic';

interface UpdateProgressPayload {
  progress?: number;
}

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
      return NextResponse.json({ msg: 'No token, authorization denied.' }, { status: 401 });
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ msg: 'Invalid quest id.' }, { status: 400 });
    }

    const body = (await req.json()) as UpdateProgressPayload;
    const progress = Number(body.progress);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return NextResponse.json({ msg: 'Progress must be a number between 0 and 100.' }, { status: 400 });
    }

    const quest = await Quest.findOne({ _id: id, userId: user.id });
    if (!quest) {
      return NextResponse.json({ msg: 'Quest not found.' }, { status: 404 });
    }

    const previousProgress = Number(quest.progress ?? quest.ratings?.[0] ?? 0);
    const wasCompleted = quest.completed;
    quest.progress = Math.round(progress);
    quest.completed = progress >= 100;
    quest.completedDate = quest.completed ? new Date() : null;
    await quest.save();

    let progression = null;
    if (wasCompleted !== quest.completed) {
      const reward = QUEST_XP_REWARD[normalizeDuration(quest.duration)] || 0;
      progression = await adjustUserXP(user.id, quest.completed ? reward : -reward);
    }



    return NextResponse.json({
      msg: 'Progress updated.',
      quest,
      progression,
    });
  } catch (error) {
    console.error('Update progress error:', error);
    return NextResponse.json({ msg: 'Server error.' }, { status: 500 });
  }
}

