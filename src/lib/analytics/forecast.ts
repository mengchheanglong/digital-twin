import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import Quest from '../models/Quest';
import dbConnect from '../db';

export interface ForecastDay {
  dayKey: string;
  dayLabel: string;
  predictedPercentage: number;
  confidence: 'high' | 'medium' | 'low';
  warning: boolean;
  tip: string | null;
}

export interface WellnessForecast {
  days: ForecastDay[];
  trend: 'improving' | 'stable' | 'declining';
  riskDays: number;
  narrative: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function linearRegression(y: number[]): { slope: number; intercept: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 50 };

  const xMean = (n - 1) / 2;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (y[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

export async function computeWellnessForecast(userId: string): Promise<WellnessForecast> {
  await dbConnect();

  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const cutoff = addDays(now, -30);

  const [checkIns, recentQuests] = await Promise.all([
    CheckIn.find({ userId: uid, date: { $gte: cutoff }, checkInType: { $ne: 'micro' } })
      .select('percentage date')
      .sort({ date: 1 })
      .lean(),
    Quest.find({ userId: uid, completedDate: { $gte: addDays(now, -7) }, completed: true })
      .select('completedDate')
      .lean(),
  ]);

  // Build a simple time-series for regression
  const percentages = checkIns.map((c) => c.percentage as number);

  const { slope, intercept } = linearRegression(percentages);

  // Compute per-day-of-week averages for cyclical adjustment
  const byDow: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const c of checkIns) {
    const dow = new Date(c.date as Date).getDay();
    byDow[dow].push(c.percentage as number);
  }
  const dowAvg: Record<number, number> = {};
  const globalMean = percentages.length ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 60;
  for (let d = 0; d < 7; d++) {
    dowAvg[d] = byDow[d].length ? byDow[d].reduce((a, b) => a + b, 0) / byDow[d].length : globalMean;
  }

  // Recent quest activity bonus (each completed quest in last 7d → small boost)
  const questBonus = Math.min(5, recentQuests.length * 0.5);

  const baseIndex = percentages.length;
  const days: ForecastDay[] = [];

  for (let i = 1; i <= 7; i++) {
    const date = addDays(now, i);
    const dow = date.getDay();
    const dayKey = formatDayKey(date);

    // Trend component
    const trendValue = intercept + slope * (baseIndex + i - 1);
    // Cyclical component (deviation from global mean for this day-of-week)
    const cyclicalAdj = dowAvg[dow] - globalMean;
    const raw = Math.max(0, Math.min(100, trendValue + cyclicalAdj * 0.3 + questBonus));
    const predictedPercentage = Math.round(raw);

    // Confidence: higher if more historical data
    const confidence: 'high' | 'medium' | 'low' =
      percentages.length >= 14 ? 'high' : percentages.length >= 7 ? 'medium' : 'low';

    const warning = predictedPercentage < 45;
    let tip: string | null = null;
    if (warning) {
      if (dow === 0 || dow === 6) tip = 'Weekend recovery: plan a restorative activity.';
      else tip = 'Complete a quest early to build momentum this day.';
    }

    days.push({
      dayKey,
      dayLabel: DAY_NAMES[dow],
      predictedPercentage,
      confidence,
      warning,
      tip,
    });
  }

  const riskDays = days.filter((d) => d.warning).length;
  const avgForecast = days.reduce((s, d) => s + d.predictedPercentage, 0) / days.length;
  const trend: 'improving' | 'stable' | 'declining' =
    slope > 0.5 ? 'improving' : slope < -0.5 ? 'declining' : 'stable';

  let narrative: string;
  if (riskDays === 0) {
    narrative = `Your wellness trajectory looks solid for the next 7 days (avg ${Math.round(avgForecast)}%). Keep up your current habits.`;
  } else if (riskDays <= 2) {
    narrative = `${riskDays} day${riskDays > 1 ? 's' : ''} next week may dip below 45%. Check the tips to stay ahead.`;
  } else {
    narrative = `The forecast shows ${riskDays} challenging days. Focus on consistent daily check-ins and small quest completions to reverse the trend.`;
  }

  return { days, trend, riskDays, narrative };
}
