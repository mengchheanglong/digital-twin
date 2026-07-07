import { findNewlyCompletedQuest } from "./questState";

describe("findNewlyCompletedQuest", () => {
  const quests = [
    { id: "active", completed: false, duration: "day" },
    { id: "done", completed: true, duration: "week" },
  ];

  it("returns the matching incomplete quest when it transitions to completed", () => {
    expect(findNewlyCompletedQuest(quests, "active", true)).toEqual(quests[0]);
  });

  it("does not return a quest when the update is not a completion", () => {
    expect(findNewlyCompletedQuest(quests, "active", false)).toBeUndefined();
  });

  it("does not return an already completed quest", () => {
    expect(findNewlyCompletedQuest(quests, "done", true)).toBeUndefined();
  });
});
