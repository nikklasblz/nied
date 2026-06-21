import { describe, expect, test } from "bun:test";
import { seededShuffle } from "../quiz/seeded-shuffle";

describe("seededShuffle", () => {
  test("is a permutation of indices", () => {
    const order = seededShuffle(5, 3);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });
  test("is deterministic for the same seed", () => {
    expect(seededShuffle(6, 42)).toEqual(seededShuffle(6, 42));
  });
  test("differs across seeds (usually) and handles n<=1", () => {
    expect(seededShuffle(1, 1)).toEqual([0]);
    expect(seededShuffle(0, 1)).toEqual([]);
  });
});
