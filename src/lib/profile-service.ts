import { computeDailyStreak, deriveBadges, getMoodFromCheckIn } from '@/lib/progression';
import CheckIn, { ICheckIn } from '@/lib/models/CheckIn';
import Quest from '@/lib/models/Quest';
import User, { IUser } from '@/lib/models/User';
import { formatJoinDate } from '@/lib/date';

export async function buildProfile(userId: string, userObj?: Partial<IUser> | null) {
  let user: Partial<IUser> | null = userObj || null;

  if (!user) {
    user = await User.findById(userId)
      .select('name age email location bio level currentXP requiredXP badges avatarStage joinDate')
      .lean();
  }

  if (!user) {
    return null;
  }

  const [totalQuests, completedQuests, checkIns, weekendQuestCount, lateNightCheckInCount] =
    await Promise.all([
      Quest.countDocuments({ userId }),
      Quest.countDocuments({ userId, completed: true }),
      CheckIn.find({ userId })
        .sort({ date: -1 })
        .limit(180)
        .select('date overallScore ratings')
        .lean() as Promise<Partial<ICheckIn>[]>,
      Quest.countDocuments({
        userId,
        completed: true,
        $expr: {
          $in: [{ $dayOfWeek: '$completedDate' }, [1, 7]],
        },
      }),
      CheckIn.countDocuments({
        userId,
        $expr: {
          $or: [{ $gte: [{ $hour: '$date' }, 23] }, { $lt: [{ $hour: '$date' }, 4] }],
        },
      }),
    ]);

  const streak = computeDailyStreak(checkIns.map((entry) => new Date(entry.date)));
  const hasEarlyCheckIn = checkIns.some((entry) => new Date(entry.date).getHours() < 8);

  const badges = deriveBadges({
    totalQuests,
    completedQuests,
    checkInCount: checkIns.length,
    streak,
    level: user.level,
    hasEarlyCheckIn,
    existingBadges: user.badges,
    weekendQuestCount,
    lateNightCheckInCount,
  });

  if (JSON.stringify(badges) !== JSON.stringify(user.badges || [])) {
    await User.findByIdAndUpdate(userId, { $set: { badges } });
  }

  const latestCheckIn = checkIns[0];
  const mood = latestCheckIn
    ? getMoodFromCheckIn(latestCheckIn.overallScore, latestCheckIn.ratings.length * 5)
    : { emoji: ':)', label: 'Stable' };

  return {
    id: String(user._id),
    name: user.name,
    age: user.age,
    email: user.email,
    location: user.location,
    bio: user.bio,
    level: user.level,
    currentXP: user.currentXP,
    requiredXP: user.requiredXP,
    dailyStreak: streak,
    currentStreak: streak,
    totalQuests,
    completedQuests,
    badges,
    avatarStage: user.avatarStage,
    joinDate: formatJoinDate(user.joinDate),
    currentMood: mood,
  };
}
