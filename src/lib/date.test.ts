import { formatJoinDate } from "@/lib/date";

describe("formatJoinDate", () => {
  it("formats a Date object to month and year", () => {
    const result = formatJoinDate(new Date("2023-01-15T00:00:00Z"));
    expect(result).toMatch(/January/i);
    expect(result).toMatch(/2023/);
  });

  it("formats a date string to month and year", () => {
    const result = formatJoinDate("2024-06-01T00:00:00Z");
    expect(result).toMatch(/June/i);
    expect(result).toMatch(/2024/);
  });

  it("handles the first day of a year", () => {
    const result = formatJoinDate(new Date("2020-01-01T00:00:00Z"));
    expect(result).toMatch(/January/i);
    expect(result).toMatch(/2020/);
  });

  it("handles the last month of a year", () => {
    const result = formatJoinDate(new Date("2021-12-31T00:00:00Z"));
    expect(result).toMatch(/December/i);
    expect(result).toMatch(/2021/);
  });
});
