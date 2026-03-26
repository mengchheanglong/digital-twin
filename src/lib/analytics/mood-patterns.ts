import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import dbConnect from '../db';

export interface DayPattern {
  dayOfWeek: number;
  dayName: string;
  averageScore: number;
  sampleCount: number;
}

export interface MoodPattern {
  bestDay: DayPattern;
  worstDay: DayPattern;
  allDays: DayPattern[];
  trend: 'improving' | 'stable' | 'declining';
  strongestDimension: string;
  weakestDimension: string;
  dimensionAverages: Record<string, number>;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DIMENSIONS = [
  'energy',
  'focus',
  'stressControl',
  'socialConnection',
  'optimism',
];

export async function computeMoodPatterns(
  userId: string,
  days = 30,
): Promise<MoodPattern> {
  await dbConnect();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const checkIns = await CheckIn.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: cutoff },
  })
    .select('ratings percentage date')
    .lean();

  const dayBuckets: Record<number, number[]> = {};
  for (let i = 0; i < 7; i++) dayBuckets[i] = [];

  const dimSums: number[] = [0, 0, 0, 0, 0];
  let dimCount = 0;

  const midpoint = new Date();
  midpoint.setDate(midpoint.getDate() - Math.floor(days / 2));

  let firstHalfSum = 0;
  let firstHalfCount = 0;
  let secondHalfSum = 0;
  let secondHalfCount = 0;

  for (const checkIn of checkIns) {
    const d = new Date(checkIn.date);
    dayBuckets[d.getDay()].push(checkIn.percentage);

    if (
      Array.isArray(checkIn.ratings) &&
      checkIn.ratings.length === 5
    ) {
      for (let i = 0; i < 5; i++) {
        dimSums[i] += (checkIn.ratings as number[])[i];
      }
      dimCount++;
    }

    if (d < midpoint) {
      firstHalfSum += checkIn.percentage;
      firstHalfCount++;
    } else {
      secondHalfSum += checkIn.percentage;
      secondHalfCount++;
    }
  }

  const allDays: DayPattern[] = DAY_NAMES.map((name, i) => {
    const scores = dayBuckets[i];
    return {
      dayOfWeek: i,
      dayName: name,
      averageScore: scores.length
        ? Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length,
          )
        : 0,
      sampleCount: scores.length,
    };
  });

  const activeDays = allDays.filter((d) => d.sampleCount > 0);
  const sortedByScore = [...activeDays].sort(
    (a, b) => b.averageScore - a.averageScore,
  );

  const bestDay = sortedByScore[0] ?? allDays[1];
  const worstDay =
    sortedByScore[sortedByScore.length - 1] ?? allDays[5];

  const firstAvg = firstHalfCount ? firstHalfSum / firstHalfCount : 50;
  const secondAvg = secondHalfCount
    ? secondHalfSum / secondHalfCount
    : 50;
  const diff = secondAvg - firstAvg;
  const trend: 'improving' | 'stable' | 'declining' =
    diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';

  const dimAvgs: Record<string, number> = {};
  if (dimCount > 0) {
    DIMENSIONS.forEach((dim, i) => {
      dimAvgs[dim] = Math.round((dimSums[i] / dimCount) * 10) / 10;
    });
  } else {
    DIMENSIONS.forEach((dim) => {
      dimAvgs[dim] = 0;
    });
  }

  const dimEntries = Object.entries(dimAvgs).sort((a, b) => b[1] - a[1]);
  const strongestDimension = dimEntries[0]?.[0] ?? 'energy';
  const weakestDimension =
    dimEntries[dimEntries.length - 1]?.[0] ?? 'focus';

  return {
    bestDay,
    worstDay,
    allDays,
    trend,
    strongestDimension,
    weakestDimension,
    dimensionAverages: dimAvgs,
  };
}
