import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import Quest from '../models/Quest';
import dbConnect from '../db';

export interface BurnoutFactor {
  name: string;
  score: number;
  description: string;
}

export type BurnoutStageLabel = 'thriving' | 'tiring' | 'strained' | 'overwhelmed';

export interface BurnoutStageInfo {
  stage: BurnoutStageLabel;
  label: string;
  color: string;
  description: string;
  minScore: number;
  maxScore: number;
}

export const BURNOUT_STAGES: BurnoutStageInfo[] = [
  {
    stage: 'thriving',
    label: 'Thriving',
    color: 'emerald',
    description: 'Your wellness patterns look healthy. Keep it up!',
    minScore: 0,
    maxScore: 24,
  },
  {
    stage: 'tiring',
    label: 'Tiring',
    color: 'yellow',
    description: 'Early signs of fatigue detected. Small adjustments now prevent bigger drops.',
    minScore: 25,
    maxScore: 49,
  },
  {
    stage: 'strained',
    label: 'Strained',
    color: 'orange',
    description: 'Significant strain. Prioritize recovery and reduce your load this week.',
    minScore: 50,
    maxScore: 74,
  },
  {
    stage: 'overwhelmed',
    label: 'Overwhelmed',
    color: 'red',
    description: 'Critical burnout risk. Please focus on rest and consider reaching out for support.',
    minScore: 75,
    maxScore: 100,
  },
];

export function toBurnoutStage(score: number): BurnoutStageInfo {
  return (
    [...BURNOUT_STAGES].reverse().find((s) => score >= s.minScore) ||
    BURNOUT_STAGES[0]
  );
}

export interface BurnoutReport {
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  stage: BurnoutStageInfo;
  factors: BurnoutFactor[];
  recommendations: string[];
  personalizedInterventions: string[];
}

export function toRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

export async function computeBurnoutRisk(
  userId: string,
): Promise<BurnoutReport> {
  await dbConnect();

  const now = new Date();
  const day7 = new Date(now);
  day7.setDate(day7.getDate() - 7);
  const day14 = new Date(now);
  day14.setDate(day14.getDate() - 14);

  const uid = new mongoose.Types.ObjectId(userId);

  const [recentCheckIns, olderCheckIns, recentQuests, olderQuests] =
    await Promise.all([
      CheckIn.find({ userId: uid, date: { $gte: day7 } })
        .select('percentage')
        .lean(),
      CheckIn.find({ userId: uid, date: { $gte: day14, $lt: day7 } })
        .select('percentage')
        .lean(),
      Quest.find({ userId: uid, date: { $gte: day7 } })
        .select('completed')
        .lean(),
      Quest.find({ userId: uid, date: { $gte: day14, $lt: day7 } })
        .select('completed')
        .lean(),
    ]);

  const factors: BurnoutFactor[] = [];

  // Factor 1: Check-in frequency (0 check-ins this week = 100 risk)
  const checkInFreqScore = Math.max(
    0,
    100 - (recentCheckIns.length / 7) * 100,
  );
  factors.push({
    name: 'Check-in frequency',
    score: Math.round(checkInFreqScore),
    description: `${recentCheckIns.length}/7 days logged this week`,
  });

  // Factor 2: Wellness trend (dropping score = higher risk)
  const recentAvg = recentCheckIns.length
    ? recentCheckIns.reduce((sum, c) => sum + c.percentage, 0) /
      recentCheckIns.length
    : 50;
  const olderAvg = olderCheckIns.length
    ? olderCheckIns.reduce((sum, c) => sum + c.percentage, 0) /
      olderCheckIns.length
    : recentAvg;
  const scoreDrop = Math.max(0, olderAvg - recentAvg);
  const trendScore =
    recentCheckIns.length === 0
      ? 60
      : Math.min(100, (scoreDrop / Math.max(1, olderAvg)) * 200);
  factors.push({
    name: 'Wellness trend',
    score: Math.round(trendScore),
    description:
      recentCheckIns.length === 0
        ? 'No check-ins this week'
        : `Avg wellness ${recentAvg.toFixed(0)}% vs ${olderAvg.toFixed(0)}% prior week`,
  });

  // Factor 3: Quest completion rate drop
  const recentCompleted = recentQuests.filter((q) => q.completed).length;
  const olderCompleted = olderQuests.filter((q) => q.completed).length;
  const recentCompRate =
    recentQuests.length > 0 ? recentCompleted / recentQuests.length : 0;
  const olderCompRate =
    olderQuests.length > 0 ? olderCompleted / olderQuests.length : recentCompRate;
  const questDropScore =
    recentQuests.length === 0
      ? 50
      : Math.max(0, Math.min(100, (olderCompRate - recentCompRate) * 150));
  factors.push({
    name: 'Quest completion',
    score: Math.round(questDropScore),
    description:
      recentQuests.length === 0
        ? 'No quests this week'
        : `${recentCompleted}/${recentQuests.length} completed (${Math.round(recentCompRate * 100)}%)`,
  });

  // Factor 4: Absolute wellness level (below 60% is concerning)
  const lowWellnessScore =
    recentCheckIns.length === 0
      ? 40
      : Math.max(0, Math.min(100, (60 - recentAvg) * 2));
  factors.push({
    name: 'Absolute wellness',
    score: Math.round(lowWellnessScore),
    description:
      recentCheckIns.length === 0
        ? 'No data to evaluate'
        : `Overall wellness at ${recentAvg.toFixed(0)}%`,
  });

  const riskScore = Math.round(
    factors.reduce((sum, f) => sum + f.score, 0) / factors.length,
  );
  const riskLevel = toRiskLevel(riskScore);
  const stage = toBurnoutStage(riskScore);

  const recommendations: string[] = [];
  if (checkInFreqScore > 50)
    recommendations.push('Log your daily check-in more consistently');
  if (trendScore > 40)
    recommendations.push(
      'Your wellness is declining — consider lighter tasks this week',
    );
  if (questDropScore > 40)
    recommendations.push('Reduce quest difficulty to rebuild momentum');
  if (lowWellnessScore > 40)
    recommendations.push('Focus on rest and recovery activities today');
  if (recommendations.length === 0)
    recommendations.push('Keep up the great work! Your patterns look healthy');

  // Personalized interventions based on which factors are elevated
  const personalizedInterventions: string[] = [];
  if (checkInFreqScore > 60) {
    personalizedInterventions.push('Set a daily check-in reminder at a consistent time you always have 2 minutes free.');
  }
  if (trendScore > 50) {
    personalizedInterventions.push('For the next 3 days, complete only 1 quest per day — small wins rebuild momentum faster than rest alone.');
  }
  if (questDropScore > 60) {
    personalizedInterventions.push('Break your active quests into smaller 15-minute micro-tasks. Progress, not perfection.');
  }
  if (lowWellnessScore > 60) {
    personalizedInterventions.push('Prioritize sleep and one outdoor activity today. Physical recovery unlocks mental recovery.');
  }
  if (riskScore >= 75) {
    personalizedInterventions.push('Consider speaking to someone you trust or a mental health professional. You deserve support.');
  }
  if (personalizedInterventions.length === 0) {
    personalizedInterventions.push('Your patterns are healthy. Keep doing what you\'re doing and celebrate your consistency.');
  }

  return { riskScore, riskLevel, stage, factors, recommendations, personalizedInterventions };
}
