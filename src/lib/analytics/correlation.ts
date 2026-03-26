import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import Quest from '../models/Quest';
import dbConnect from '../db';
import { getDayKey } from '../progression';

export interface CorrelationResult {
  dimension: string;
  coefficient: number;
  label: string;
  sampleSize: number;
}

export interface CorrelationReport {
  correlations: CorrelationResult[];
  interpretation: string;
  sampleDays: number;
}

export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;

  return Math.round((numerator / denominator) * 1000) / 1000;
}

export function interpretCorrelation(coefficient: number): string {
  const abs = Math.abs(coefficient);
  const direction = coefficient >= 0 ? 'positive' : 'negative';

  if (abs >= 0.7) return `Strong ${direction} correlation`;
  if (abs >= 0.4) return `Moderate ${direction} correlation`;
  if (abs >= 0.2) return `Weak ${direction} correlation`;
  return 'No meaningful correlation';
}

const DIMENSION_LABELS = [
  'energy',
  'focus',
  'stressControl',
  'socialConnection',
  'optimism',
];

export async function computeCorrelation(
  userId: string,
  days = 30,
): Promise<CorrelationReport> {
  await dbConnect();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  const [checkIns, quests] = await Promise.all([
    CheckIn.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: cutoff },
    })
      .select('ratings dayKey')
      .lean(),
    Quest.find({
      userId: new mongoose.Types.ObjectId(userId),
      completedDate: { $gte: cutoff },
      completed: true,
    })
      .select('completedDate')
      .lean(),
  ]);

  const questCompletionsByDay: Record<string, number> = {};
  for (const quest of quests) {
    if (quest.completedDate) {
      const key = getDayKey(new Date(quest.completedDate));
      questCompletionsByDay[key] = (questCompletionsByDay[key] || 0) + 1;
    }
  }

  const checkInsByDay: Record<string, number[]> = {};
  for (const checkIn of checkIns) {
    if (
      checkIn.dayKey &&
      Array.isArray(checkIn.ratings) &&
      checkIn.ratings.length === 5
    ) {
      checkInsByDay[checkIn.dayKey] = checkIn.ratings as number[];
    }
  }

  const commonDays = Object.keys(checkInsByDay).filter(
    (day) => questCompletionsByDay[day] !== undefined,
  );
  const sampleDays = commonDays.length;

  if (sampleDays < 3) {
    return {
      correlations: DIMENSION_LABELS.map((dim) => ({
        dimension: dim,
        coefficient: 0,
        label: 'Insufficient data',
        sampleSize: sampleDays,
      })),
      interpretation:
        'Need at least 3 days of overlapping check-in and quest data.',
      sampleDays,
    };
  }

  const questY = commonDays.map((day) => questCompletionsByDay[day]);

  const correlations: CorrelationResult[] = DIMENSION_LABELS.map(
    (dim, i) => {
      const dimX = commonDays.map((day) => checkInsByDay[day][i]);
      const coeff = pearsonCorrelation(dimX, questY);
      return {
        dimension: dim,
        coefficient: coeff,
        label: interpretCorrelation(coeff),
        sampleSize: sampleDays,
      };
    },
  );

  const strongest = correlations.reduce((a, b) =>
    Math.abs(a.coefficient) >= Math.abs(b.coefficient) ? a : b,
  );

  const interpretation =
    strongest.coefficient === 0
      ? 'No significant correlation found between check-in dimensions and quest completion.'
      : `Your ${strongest.dimension} score shows the ${strongest.label.toLowerCase()} with quest completion (r=${strongest.coefficient}).`;

  return { correlations, interpretation, sampleDays };
}
