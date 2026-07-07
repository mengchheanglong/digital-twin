import { getProfileNameTextSize } from "./profileHeaderName";

describe("getProfileNameTextSize", () => {
  it("uses the default display size for short profile names", () => {
    expect(getProfileNameTextSize("Ember")).toBe("text-3xl sm:text-5xl");
  });

  it("reduces the mobile size for long single-token names", () => {
    expect(getProfileNameTextSize("Bughunter+1783404939")).toBe(
      "text-[1.625rem] sm:text-5xl",
    );
  });

  it("steps down again for very long names", () => {
    expect(getProfileNameTextSize("averyverylongsingleidentityname")).toBe(
      "text-[1.35rem] sm:text-4xl",
    );
  });
});
