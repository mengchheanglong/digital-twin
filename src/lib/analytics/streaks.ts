import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import Quest from '../models/Quest';
import JournalEntry from '../models/JournalEntry';
import FocusSession from '../models/FocusSession';
import dbConnect from '../db';
import { computeDailyStreak, getDayKey } from '../progression';

export interface StreakDetail {
  name: string;
  current: number;
  best: number;
  unit: string;
}

export interface StreakReport {
  streaks: StreakDetail[];
  overallStreak: number;
}

async function getDatesByField(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: mongoose.Model<any>,
  userId: mongoose.Types.ObjectId,
  dateField: string,
  extraFilter: Record<string, unknown> = {},
): Promise<Date[]> {
  const docs = await model
    .find({ userId, ...extraFilter })
    .select(dateField)
    .lean();
  return docs
    .map((doc: Record<string, unknown>) => doc[dateField] as Date | undefined)
    .filter((d): d is Date => d instanceof Date || typeof d === 'string')
    .map((d) => new Date(d));
}

export function computeBestStreak(dates: Date[]): number {
  if (!dates.length) return 0;

  const uniqueDays = Array.from(
    new Set(dates.map((d) => getDayKey(new Date(d)))),
  ).sort();

  if (!uniqueDays.length) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(`${uniqueDays[i - 1]}T00:00:00`);
    const curr = new Date(`${uniqueDays[i]}T00:00:00`);
    const diff = Math.round(
      (curr.getTime() - prev.getTime()) / 86400000,
    );

    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export async function computeStreaks(
  userId: string,
): Promise<StreakReport> {
  await dbConnect();

  const uid = new mongoose.Types.ObjectId(userId);

  const [checkInDates, questDates, journalDates, focusDates] =
    await Promise.all([
      getDatesByField(CheckIn, uid, 'date'),
      getDatesByField(Quest, uid, 'completedDate', { completed: true }),
      getDatesByField(JournalEntry, uid, 'date'),
      getDatesByField(FocusSession, uid, 'startedAt', {
        completed: true,
      }),
    ]);

  const checkInCurrent = computeDailyStreak(checkInDates);
  const questCurrent = computeDailyStreak(questDates);
  const journalCurrent = computeDailyStreak(journalDates);
  const focusCurrent = computeDailyStreak(focusDates);

  const checkInBest = computeBestStreak(checkInDates);
  const questBest = computeBestStreak(questDates);
  const journalBest = computeBestStreak(journalDates);
  const focusBest = computeBestStreak(focusDates);

  const overallStreak = computeDailyStreak([
    ...checkInDates,
    ...questDates,
  ]);

  return {
    streaks: [
      {
        name: 'Daily Check-in',
        current: checkInCurrent,
        best: checkInBest,
        unit: 'days',
      },
      {
        name: 'Quest Completion',
        current: questCurrent,
        best: questBest,
        unit: 'days',
      },
      {
        name: 'Journal Writing',
        current: journalCurrent,
        best: journalBest,
        unit: 'days',
      },
      {
        name: 'Focus Sessions',
        current: focusCurrent,
        best: focusBest,
        unit: 'days',
      },
    ],
    overallStreak,
  };
}
