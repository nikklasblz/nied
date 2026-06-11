import { describe, expect, test } from "bun:test";
import { gradeCard, nextDueDate, BOX_INTERVALS_DAYS } from "../srs/leitner";

describe("leitner", () => {
  test("correct promotes box, capped at 5", () => {
    expect(gradeCard(1, true)).toBe(2);
    expect(gradeCard(4, true)).toBe(5);
    expect(gradeCard(5, true)).toBe(5);
  });
  test("wrong resets to box 1", () => {
    expect(gradeCard(5, false)).toBe(1);
    expect(gradeCard(1, false)).toBe(1);
  });
  test("intervals are 1/2/4/8/16 days for boxes 1-5", () => {
    expect(BOX_INTERVALS_DAYS).toEqual([1, 2, 4, 8, 16]);
  });
  test("nextDueDate adds interval days (ISO date)", () => {
    expect(nextDueDate(1, "2026-06-11")).toBe("2026-06-12");
    expect(nextDueDate(3, "2026-06-11")).toBe("2026-06-15");
    expect(nextDueDate(5, "2026-06-30")).toBe("2026-07-16");
  });
});
