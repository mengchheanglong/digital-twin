import User from '@/lib/models/User';
import { applyXPDelta, normalizeProgressState, ProgressState } from '@/lib/progression';

const MAX_XP_UPDATE_ATTEMPTS = 3;

export async function adjustUserXP(userId: string, deltaXP: number): Promise<ProgressState | null> {
  for (let attempt = 0; attempt < MAX_XP_UPDATE_ATTEMPTS; attempt += 1) {
    const user = await User.findById(userId)
      .select('level currentXP requiredXP')
      .lean();

    if (!user) {
      return null;
    }

    const current = normalizeProgressState({
      level: user.level,
      currentXP: user.currentXP,
      requiredXP: user.requiredXP,
    });

    const next = applyXPDelta(current, deltaXP);
    const updated = await User.findOneAndUpdate(
      {
        _id: userId,
        level: current.level,
        currentXP: current.currentXP,
        requiredXP: current.requiredXP,
      },
      {
        $set: {
          level: next.level,
          currentXP: next.currentXP,
          requiredXP: next.requiredXP,
        },
      },
      { new: true },
    )
      .select('level currentXP requiredXP')
      .lean();

    if (updated) {
      return normalizeProgressState({
        level: updated.level,
        currentXP: updated.currentXP,
        requiredXP: updated.requiredXP,
      });
    }
  }

  throw new Error('Unable to update user XP after concurrent modifications.');
}
