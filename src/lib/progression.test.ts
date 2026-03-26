import {
  getRequiredXP,
  normalizeDuration,
  normalizeProgressState,
  applyXPDelta,
  computeDailyStreak,
  getDayKey,
  deriveBadges,
  getMoodFromCheckIn,
} from "@/lib/progression";

// ---------------------------------------------------------------------------
// getRequiredXP
// ---------------------------------------------------------------------------
describe("getRequiredXP", () => {
  it("returns 100 for level 1", () => {
    expect(getRequiredXP(1)).toBe(100);
  });

  it("increases by 25 per level", () => {
    expect(getRequiredXP(2)).toBe(125);
    expect(getRequiredXP(3)).toBe(150);
    expect(getRequiredXP(10)).toBe(325);
  });

  it("clamps level to at least 1 for non-positive values", () => {
    expect(getRequiredXP(0)).toBe(getRequiredXP(1));
    expect(getRequiredXP(-5)).toBe(getRequiredXP(1));
  });

  it("handles non-finite level gracefully", () => {
    expect(getRequiredXP(NaN)).toBe(100);
    expect(getRequiredXP(Infinity)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// normalizeDuration
// ---------------------------------------------------------------------------
describe("normalizeDuration", () => {
  it("returns daily for an unrecognized string", () => {
    expect(normalizeDuration("")).toBe("daily");
    expect(normalizeDuration("hourly")).toBe("daily");
  });

  it("normalizes case and whitespace", () => {
    expect(normalizeDuration("  Weekly  ")).toBe("weekly");
    expect(normalizeDuration("MONTHLY")).toBe("monthly");
  });

  it("passes through valid values", () => {
    expect(normalizeDuration("daily")).toBe("daily");
    expect(normalizeDuration("weekly")).toBe("weekly");
    expect(normalizeDuration("monthly")).toBe("monthly");
    expect(normalizeDuration("yearly")).toBe("yearly");
  });
});

// ---------------------------------------------------------------------------
// normalizeProgressState
// ---------------------------------------------------------------------------
describe("normalizeProgressState", () => {
  it("uses defaults for null/undefined input", () => {
    const state = normalizeProgressState(null);
    expect(state.level).toBe(1);
    expect(state.currentXP).toBe(0);
    expect(state.requiredXP).toBe(100);
  });

  it("floors and clamps level to minimum 1", () => {
    const state = normalizeProgressState({ level: -3 });
    expect(state.level).toBe(1);
  });

  it("clamps currentXP to requiredXP", () => {
    const state = normalizeProgressState({ level: 1, currentXP: 9999, requiredXP: 100 });
    expect(state.currentXP).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// applyXPDelta
// ---------------------------------------------------------------------------
describe("applyXPDelta", () => {
  it("increases XP without leveling up", () => {
    const result = applyXPDelta({ level: 1, currentXP: 0, requiredXP: 100 }, 50);
    expect(result.level).toBe(1);
    expect(result.currentXP).toBe(50);
  });

  it("levels up when XP meets the threshold", () => {
    const result = applyXPDelta({ level: 1, currentXP: 90, requiredXP: 100 }, 20);
    expect(result.level).toBe(2);
    expect(result.currentXP).toBe(10);
  });

  it("handles multiple level-ups in one delta", () => {
    const result = applyXPDelta({ level: 1, currentXP: 0, requiredXP: 100 }, 500);
    expect(result.level).toBeGreaterThan(3);
  });

  it("decreases XP without de-leveling", () => {
    const result = applyXPDelta({ level: 2, currentXP: 50, requiredXP: 125 }, -30);
    expect(result.level).toBe(2);
    expect(result.currentXP).toBe(20);
  });

  it("de-levels when XP goes negative", () => {
    const result = applyXPDelta({ level: 2, currentXP: 10, requiredXP: 125 }, -50);
    expect(result.level).toBe(1);
  });

  it("does not go below level 1 or negative XP", () => {
    const result = applyXPDelta({ level: 1, currentXP: 0, requiredXP: 100 }, -999);
    expect(result.level).toBe(1);
    expect(result.currentXP).toBe(0);
  });

  it("handles zero delta", () => {
    const initial = { level: 3, currentXP: 40, requiredXP: 150 };
    const result = applyXPDelta(initial, 0);
    expect(result.level).toBe(3);
    expect(result.currentXP).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// getDayKey
// ---------------------------------------------------------------------------
describe("getDayKey", () => {
  it("returns a YYYY-MM-DD string", () => {
    const key = getDayKey(new Date(2024, 0, 5)); // Jan 5
    expect(key).toBe("2024-01-05");
  });

  it("zero-pads month and day", () => {
    const key = getDayKey(new Date(2024, 8, 9)); // Sep 9
    expect(key).toBe("2024-09-09");
  });
});

// ---------------------------------------------------------------------------
// computeDailyStreak
// ---------------------------------------------------------------------------
describe("computeDailyStreak", () => {
  function daysAgo(n: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  }

  it("returns 0 for an empty array", () => {
    expect(computeDailyStreak([])).toBe(0);
  });

  it("returns 1 for a single entry today", () => {
    expect(computeDailyStreak([daysAgo(0)])).toBe(1);
  });

  it("returns 1 for a single entry yesterday", () => {
    expect(computeDailyStreak([daysAgo(1)])).toBe(1);
  });

  it("returns 0 when last entry is 2 days ago", () => {
    expect(computeDailyStreak([daysAgo(2)])).toBe(0);
  });

  it("counts consecutive days correctly", () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)];
    expect(computeDailyStreak(dates)).toBe(4);
  });

  it("stops at a gap in the streak", () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(3)]; // gap on day 2
    expect(computeDailyStreak(dates)).toBe(2);
  });

  it("deduplicates same-day entries", () => {
    const today = new Date();
    const yesterday = daysAgo(1);
    const dates = [today, today, yesterday, yesterday];
    expect(computeDailyStreak(dates)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// deriveBadges
// ---------------------------------------------------------------------------
describe("deriveBadges", () => {
  const base = {
    totalQuests: 0,
    completedQuests: 0,
    checkInCount: 0,
    streak: 0,
    level: 1,
    hasEarlyCheckIn: false,
  };

  it("returns no badges for a brand-new user", () => {
    expect(deriveBadges(base)).toHaveLength(0);
  });

  it("awards First Quest when totalQuests >= 1", () => {
    const badges = deriveBadges({ ...base, totalQuests: 1 });
    expect(badges).toContain("First Quest");
  });

  it("awards Week Warrior when completedQuests >= 7", () => {
    const badges = deriveBadges({ ...base, completedQuests: 7 });
    expect(badges).toContain("Week Warrior");
  });

  it("awards Level 10 at level 10", () => {
    const badges = deriveBadges({ ...base, level: 10 });
    expect(badges).toContain("Level 10");
  });

  it("awards Streak Master at streak 30", () => {
    const badges = deriveBadges({ ...base, streak: 30 });
    expect(badges).toContain("Streak Master");
  });

  it("awards Mindful at 10 check-ins", () => {
    const badges = deriveBadges({ ...base, checkInCount: 10 });
    expect(badges).toContain("Mindful");
  });

  it("awards Early Bird for early check-in", () => {
    const badges = deriveBadges({ ...base, hasEarlyCheckIn: true });
    expect(badges).toContain("Early Bird");
  });

  it("preserves existing badges", () => {
    const badges = deriveBadges({ ...base, existingBadges: ["OldBadge"] });
    expect(badges).toContain("OldBadge");
  });

  it("does not duplicate existing badges", () => {
    const badges = deriveBadges({ ...base, totalQuests: 1, existingBadges: ["First Quest"] });
    expect(badges.filter((b) => b === "First Quest")).toHaveLength(1);
  });

  it("awards Weekend Warrior for weekend quests", () => {
    const badges = deriveBadges({ ...base, weekendQuestCount: 1 });
    expect(badges).toContain("Weekend Warrior");
  });

  it("awards Night Owl for late night check-ins", () => {
    const badges = deriveBadges({ ...base, lateNightCheckInCount: 1 });
    expect(badges).toContain("Night Owl");
  });
});

// ---------------------------------------------------------------------------
// getMoodFromCheckIn
// ---------------------------------------------------------------------------
describe("getMoodFromCheckIn", () => {
  it("returns Excellent at >= 80%", () => {
    const mood = getMoodFromCheckIn(20, 25); // 80%
    expect(mood.label).toBe("Excellent");
  });

  it("returns Great at 60%", () => {
    const mood = getMoodFromCheckIn(15, 25); // 60%
    expect(mood.label).toBe("Great");
  });

  it("returns Good at 40%", () => {
    const mood = getMoodFromCheckIn(10, 25); // 40%
    expect(mood.label).toBe("Good");
  });

  it("returns Neutral at 20%", () => {
    const mood = getMoodFromCheckIn(5, 25); // 20%
    expect(mood.label).toBe("Neutral");
  });

  it("returns Low below 20%", () => {
    const mood = getMoodFromCheckIn(4, 25); // 16%
    expect(mood.label).toBe("Low");
  });

  it("handles zero maxScore gracefully (returns Neutral)", () => {
    const mood = getMoodFromCheckIn(10, 0);
    expect(mood.label).toBe("Neutral");
  });

  it("uses default maxScore of 25", () => {
    const mood = getMoodFromCheckIn(25); // 100%
    expect(mood.label).toBe("Excellent");
  });
});
