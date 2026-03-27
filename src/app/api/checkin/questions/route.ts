import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { getDayKeyTz, CHECKIN_DIMENSIONS } from '@/lib/progression';
import CheckIn from '@/lib/models/CheckIn';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

const DAILY_QUESTIONS: Record<(typeof CHECKIN_DIMENSIONS)[number], string> = {
  energy:            'How has your emotional energy been today?',
  focus:             'How focused did you feel on key priorities?',
  stressControl:     'How steady was your stress level today?',
  socialConnection:  'How connected did you feel to people around you?',
  optimism:          'How positive do you feel about tomorrow?',
};

// Build the ordered question list matching CHECKIN_DIMENSIONS order
const ORDERED_QUESTIONS = CHECKIN_DIMENSIONS.map((dim) => DAILY_QUESTIONS[dim]);

export async function GET(req: Request) {
  try {
    await dbConnect();

    const user = await verifyTokenWithRevocation(req);
    if (!user) {
      return NextResponse.json({ msg: 'No token, authorization denied.' }, { status: 401 });
    }

    const userDoc = await User.findById(user.id).select('timezone').lean();
    const timezone = userDoc?.timezone || 'UTC';

    const dayKey = getDayKeyTz(new Date(), timezone);
    const existingCheckIn = await CheckIn.findOne({ userId: user.id, dayKey });

    if (existingCheckIn) {
      return NextResponse.json({ msg: 'Daily check-in already completed.' }, { status: 400 });
    }

    return NextResponse.json({
      questions: ORDERED_QUESTIONS,
      expectedRatings: ORDERED_QUESTIONS.length,
    });
  } catch (error) {
    console.error('Questions error:', error);
    return NextResponse.json({ msg: 'Server error.' }, { status: 500 });
  }
}
