import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
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
    const quest = await Quest.findOneAndUpdate(
      { _id: id, userId: user.id, completed: false },
      {
        $set: {
          progress: roundedProgress,
        },
      },
      { new: true },
    );

    if (!quest) {
      return notFound('Quest not found.');
    }

    return NextResponse.json({
      msg: 'Progress updated.',
      quest,
      progression: null,
    });
  } catch (error) {
    return serverError(error, 'Update progress error');
  }
}

