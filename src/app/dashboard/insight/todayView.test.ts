import { getTodayHeadline, getTrendLabel, getXpPercent } from "./todayView";
import type { MobileToday } from "@/lib/mobile-today";

function buildToday(
  overrides: Partial<MobileToday> = {},
): MobileToday {
  return {
    version: "mobile-today.v0",
    generatedAt: "2026-07-10T08:00:00.000Z",
    dayKey: "2026-07-10",
    user: {
      name: "Test User",
      level: 2,
      currentXP: 50,
      requiredXP: 125,
      streak: 1,
      mood: { emoji: ":)", label: "Stable" },
    },
    checkIn: {
      completedToday: false,
      historyCount: 0,
      score: null,
      dimensions: null,
    },
    quest: {
      current: null,
      nextAction: {
        label: "Check in",
        href: "/dashboard/checkin",
        reason: "Complete your daily check-in.",
      },
    },
    insight: {
      trend: "stable",
      topInterest: "General",
      productivityScore: 0,
      entertainmentRatio: 0,
      reflection: "No reflection yet.",
    },
    launcher: {
      primaryLabel: "Check in",
      primaryHref: "/dashboard/checkin",
      secondaryLabel: "Continue quest",
      secondaryHref: "/dashboard/quest",
    },
    ...overrides,
  };
}

describe("Today view helpers", () => {
  it("clamps XP progress to a usable percentage", () => {
    expect(getXpPercent(50, 125)).toBe(40);
    expect(getXpPercent(200, 100)).toBe(100);
    expect(getXpPercent(-10, 100)).toBe(0);
    expect(getXpPercent(10, 0)).toBe(0);
  });

  it("prioritizes the daily pulse before later actions", () => {
    expect(getTodayHeadline(buildToday())).toBe("Take your daily pulse");
  });

  it("moves to the current quest after check-in", () => {
    const today = buildToday({
      checkIn: { completedToday: true, historyCount: 1, score: 80, dimensions: null },
      quest: {
        current: { goal: "Walk for 20 minutes", duration: "daily", progress: 40 },
        nextAction: {
          label: "Continue quest",
          href: "/dashboard/quest",
          reason: "Resume your active quest.",
        },
      },
    });

    expect(getTodayHeadline(today)).toBe("Keep your momentum moving");
  });

  it("uses restrained, actionable trend language", () => {
    expect(getTrendLabel("rising")).toBe("Rising");
    expect(getTrendLabel("stable")).toBe("Stable");
    expect(getTrendLabel("dropping")).toBe("Needs care");
  });
});
