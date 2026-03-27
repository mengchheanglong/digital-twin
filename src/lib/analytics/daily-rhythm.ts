import mongoose from 'mongoose';
import CheckIn from '../models/CheckIn';
import dbConnect from '../db';

export interface HourlyBucket {
  hour: number;
  label: string;
  averagePercentage: number;
  sampleCount: number;
  dimensions: {
    energy: number;
    focus: number;
    stressControl: number;
    socialConnection: number;
    optimism: number;
  };
}

export interface DailyRhythmReport {
  buckets: HourlyBucket[];
  peakFocusWindow: string | null;
  peakEnergyWindow: string | null;
  lowestHour: string | null;
  totalMicroCheckIns: number;
  message: string;
}

function hourLabel(h: number): string {
  const period = h < 12 ? 'am' : 'pm';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}${period}`;
}

export async function computeDailyRhythm(userId: string): Promise<DailyRhythmReport> {
  await dbConnect();

  const uid = new mongoose.Types.ObjectId(userId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const microCheckIns = await CheckIn.find({
    userId: uid,
    checkInType: 'micro',
    date: { $gte: cutoff },
    hour: { $exists: true },
  })
    .select('ratings percentage hour')
    .lean();

  const totalMicroCheckIns = microCheckIns.length;

  if (totalMicroCheckIns < 3) {
    return {
      buckets: [],
      peakFocusWindow: null,
      peakEnergyWindow: null,
      lowestHour: null,
      totalMicroCheckIns,
      message: 'Need at least 3 micro check-ins to show your daily rhythm.',
    };
  }

  // Group by hour
  const hourBuckets: Record<
    number,
    { percentages: number[]; dims: number[][] }
  > = {};
  for (const ci of microCheckIns) {
    const h = ci.hour as number;
    if (!hourBuckets[h]) hourBuckets[h] = { percentages: [], dims: [] };
    hourBuckets[h].percentages.push(ci.percentage as number);
    if (Array.isArray(ci.ratings) && ci.ratings.length === 5) {
      hourBuckets[h].dims.push(ci.ratings as number[]);
    }
  }

  const mean = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const buckets: HourlyBucket[] = Object.entries(hourBuckets)
    .map(([hourStr, data]) => {
      const h = Number(hourStr);
      const dimMeans = {
        energy: mean(data.dims.map((d) => d[0])),
        focus: mean(data.dims.map((d) => d[1])),
        stressControl: mean(data.dims.map((d) => d[2])),
        socialConnection: mean(data.dims.map((d) => d[3])),
        optimism: mean(data.dims.map((d) => d[4])),
      };
      return {
        hour: h,
        label: hourLabel(h),
        averagePercentage: Math.round(mean(data.percentages)),
        sampleCount: data.percentages.length,
        dimensions: {
          energy: Math.round(dimMeans.energy * 10) / 10,
          focus: Math.round(dimMeans.focus * 10) / 10,
          stressControl: Math.round(dimMeans.stressControl * 10) / 10,
          socialConnection: Math.round(dimMeans.socialConnection * 10) / 10,
          optimism: Math.round(dimMeans.optimism * 10) / 10,
        },
      };
    })
    .sort((a, b) => a.hour - b.hour);

  const withData = buckets.filter((b) => b.sampleCount >= 2);

  const peakFocus =
    withData.length > 0
      ? withData.reduce((best, b) =>
          b.dimensions.focus > best.dimensions.focus ? b : best
        )
      : null;

  const peakEnergy =
    withData.length > 0
      ? withData.reduce((best, b) =>
          b.dimensions.energy > best.dimensions.energy ? b : best
        )
      : null;

  const lowest =
    withData.length > 0
      ? withData.reduce((worst, b) =>
          b.averagePercentage < worst.averagePercentage ? b : worst
        )
      : null;

  let message = `Analyzed ${totalMicroCheckIns} micro check-ins across ${buckets.length} distinct hours.`;
  if (peakFocus) message += ` Peak focus is around ${peakFocus.label}.`;

  return {
    buckets,
    peakFocusWindow: peakFocus ? peakFocus.label : null,
    peakEnergyWindow: peakEnergy ? peakEnergy.label : null,
    lowestHour: lowest ? lowest.label : null,
    totalMicroCheckIns,
    message,
  };
}
