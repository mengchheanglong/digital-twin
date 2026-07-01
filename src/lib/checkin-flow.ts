export type GuidedForwardState =
  | { type: "blocked" }
  | {
      type: "next";
      ratings: number[];
      nextIndex: number;
      nextSelectedRating: number;
    }
  | { type: "complete"; ratings: number[] };

export function getGuidedForwardState({
  currentIndex,
  questionCount,
  ratings,
  selectedRating,
  ratingOverride,
}: {
  currentIndex: number;
  questionCount: number;
  ratings: number[];
  selectedRating: number;
  ratingOverride?: number;
}): GuidedForwardState {
  const activeRating = ratingOverride ?? selectedRating;
  if (
    activeRating === 0 ||
    questionCount <= 0 ||
    currentIndex < 0 ||
    currentIndex >= questionCount
  ) {
    return { type: "blocked" };
  }

  const nextRatings = [...ratings];
  nextRatings[currentIndex] = activeRating;

  if (currentIndex < questionCount - 1) {
    const nextIndex = currentIndex + 1;
    return {
      type: "next",
      ratings: nextRatings,
      nextIndex,
      nextSelectedRating: nextRatings[nextIndex] ?? 0,
    };
  }

  return { type: "complete", ratings: nextRatings };
}
