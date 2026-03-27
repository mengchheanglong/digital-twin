import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import { unauthorized, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return unauthorized('No token, authorization denied.');
    }

    const { id } = params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ msg: 'Invalid quest id.' }, { status: 400 });
    }

    // Find the quest first before deleting
    const quest = await Quest.findOne({ _id: id, userId: user.id });

    if (!quest) {
      return NextResponse.json({ msg: 'Quest not found.' }, { status: 404 });
    }

    // If quest was completed, update existing QuestLog to mark as deleted
    if (quest.completed) {
      await QuestLog.findOneAndUpdate(
        { userId: user.id, questId: quest._id },
        {
          $set: {
            deletedDate: new Date(),
            isDeleted: true,
          },
        }
      );
    }

    // Now delete the quest
    await Quest.findByIdAndDelete(id);

    return NextResponse.json({ msg: 'Quest deleted.' });
  } catch (error) {
    return serverError(error, 'Delete quest error');
  }
}
