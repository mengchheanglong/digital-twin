import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import Quest from '../models/Quest';
import dbConnect from '../db';

export interface BurnoutFactor {
  name: string;
  score: number;
  description: string;
}

export interface BurnoutReport {
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  factors: BurnoutFactor[];
  recommendations: string[];
}

function toRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
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

  return { riskScore, riskLevel, factors, recommendations };
}
