import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import Quest from '../models/Quest';
import dbConnect from '../db';
import { getDayKey } from '../progression';

export interface SynergyPair {
  habitA: string;
  habitB: string;
  dimension: string;
  liftPercent: number;
  sampleCount: number;
  description: string;
}

export interface SynergyReport {
  pairs: SynergyPair[];
  message: string;
}

const DIMENSION_NAMES = ['energy', 'focus', 'stressControl', 'socialConnection', 'optimism'];

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export async function computeHabitSynergies(userId: string): Promise<SynergyReport> {
  await dbConnect();

  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 60);

  // Fetch completed quests and group by day
  const quests = await Quest.find({
    userId: uid,
    completed: true,
    completedDate: { $gte: cutoff },
  })
    .select('goal completedDate')
    .lean();

  // Fetch check-ins in the same window
  const checkIns = await CheckIn.find({
    userId: uid,
    date: { $gte: cutoff },
    checkInType: { $ne: 'micro' },
  })
    .select('ratings percentage dayKey date')
    .lean();

  if (!checkIns.length || !quests.length) {
    return {
      pairs: [],
      message: 'Need at least 60 days of data with quests and check-ins to discover synergies.',
    };
  }

  // Group quest completions by dayKey → set of goals
  const questsByDay: Record<string, string[]> = {};
  for (const q of quests) {
    if (!q.completedDate) continue;
    const key = getDayKey(new Date(q.completedDate));
    if (!questsByDay[key]) questsByDay[key] = [];
    questsByDay[key].push(String(q.goal).toLowerCase().trim());
  }

  // Group check-ins by dayKey
  const checkInsByDay: Record<string, { ratings: number[]; percentage: number }> = {};
  for (const c of checkIns) {
    if (c.dayKey && Array.isArray(c.ratings) && c.ratings.length === 5) {
      checkInsByDay[c.dayKey] = { ratings: c.ratings as number[], percentage: c.percentage as number };
    }
  }

  // Collect all unique habit labels that appear >= 3 days
  const habitCounts: Record<string, number> = {};
  for (const goals of Object.values(questsByDay)) {
    for (const g of goals) {
      habitCounts[g] = (habitCounts[g] || 0) + 1;
    }
  }
  const validHabits = Object.keys(habitCounts).filter((h) => habitCounts[h] >= 3);

  if (validHabits.length < 2) {
    return {
      pairs: [],
      message: 'Need at least 2 recurring habits (3+ completions each) to find synergies.',
    };
  }

  // For each pair of habits, find days where BOTH were done vs. just one
  const synergies: SynergyPair[] = [];

  for (let i = 0; i < validHabits.length; i++) {
    for (let j = i + 1; j < validHabits.length; j++) {
      const hA = validHabits[i];
      const hB = validHabits[j];

      const bothDays: string[] = [];
      const onlyADays: string[] = [];
      const onlyBDays: string[] = [];

      for (const [day, goals] of Object.entries(questsByDay)) {
        const hasA = goals.includes(hA);
        const hasB = goals.includes(hB);
        if (hasA && hasB) bothDays.push(day);
        else if (hasA) onlyADays.push(day);
        else if (hasB) onlyBDays.push(day);
      }

      if (bothDays.length < 3) continue;

      // Check next-day check-in scores for each category
      for (let dimIdx = 0; dimIdx < DIMENSION_NAMES.length; dimIdx++) {
        const getNextDayScore = (days: string[]): number[] => {
          return days.flatMap((day) => {
            const d = new Date(`${day}T00:00:00`);
            d.setDate(d.getDate() + 1);
            const nextKey = getDayKey(d);
            const ci = checkInsByDay[nextKey];
            return ci ? [ci.ratings[dimIdx]] : [];
          });
        };

        const bothScores = getNextDayScore(bothDays);
        const singleScores = [...getNextDayScore(onlyADays), ...getNextDayScore(onlyBDays)];

        if (bothScores.length < 3 || singleScores.length < 3) continue;

        const bothMean = mean(bothScores);
        const singleMean = mean(singleScores) || 1;
        const liftPercent = Math.round(((bothMean - singleMean) / singleMean) * 100);

        // Only report meaningful positive synergies
        if (liftPercent < 10) continue;

        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const dimLabel = ['Energy', 'Focus', 'Stress Control', 'Social Connection', 'Optimism'][dimIdx];

        synergies.push({
          habitA: capitalize(hA),
          habitB: capitalize(hB),
          dimension: DIMENSION_NAMES[dimIdx],
          liftPercent,
          sampleCount: bothDays.length,
          description: `When you do both "${capitalize(hA)}" and "${capitalize(hB)}" on the same day, your next-day ${dimLabel} improves by ${liftPercent}% (${bothDays.length} occurrences).`,
        });
      }
    }
  }

  // Sort by lift descending, keep top 10
  synergies.sort((a, b) => b.liftPercent - a.liftPercent);
  const top = synergies.slice(0, 10);

  const message =
    top.length > 0
      ? `Found ${top.length} habit synerg${top.length === 1 ? 'y' : 'ies'} from your last 60 days.`
      : 'No significant synergies yet. Keep logging quests and check-ins for at least 60 days.';

  return { pairs: top, message };
}
