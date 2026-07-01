import { getGuidedForwardState } from "./checkin-flow";

describe("getGuidedForwardState", () => {
  it("uses the explicit rating for auto-advance when selected state is stale", () => {
    const result = getGuidedForwardState({
      currentIndex: 0,
      questionCount: 5,
      ratings: [],
      selectedRating: 0,
      ratingOverride: 4,
    });

    expect(result).toEqual({
      type: "next",
      ratings: [4],
      nextIndex: 1,
      nextSelectedRating: 0,
    });
  });

  it("advances with the selected rating for manual navigation", () => {
    const result = getGuidedForwardState({
      currentIndex: 1,
      questionCount: 5,
      ratings: [4],
      selectedRating: 3,
    });

    expect(result).toEqual({
      type: "next",
      ratings: [4, 3],
      nextIndex: 2,
      nextSelectedRating: 0,
    });
  });

  it("blocks forward navigation without a rating", () => {
    const result = getGuidedForwardState({
      currentIndex: 0,
      questionCount: 5,
      ratings: [],
      selectedRating: 0,
    });

    expect(result).toEqual({ type: "blocked" });
  });

  it("returns complete with the final rating recorded", () => {
    const result = getGuidedForwardState({
      currentIndex: 4,
      questionCount: 5,
      ratings: [4, 3, 2, 5],
      selectedRating: 1,
    });

    expect(result).toEqual({
      type: "complete",
      ratings: [4, 3, 2, 5, 1],
    });
  });
});
