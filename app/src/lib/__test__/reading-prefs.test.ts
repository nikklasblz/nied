// src/lib/__test__/reading-prefs.test.ts
import { describe, expect, test } from "bun:test";
import { coercePrefs, DEFAULT_PREFS } from "../reading/prefs";

describe("coercePrefs", () => {
  test("returns defaults for null/garbage", () => {
    expect(coercePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(coercePrefs("nope")).toEqual(DEFAULT_PREFS);
    expect(coercePrefs(42)).toEqual(DEFAULT_PREFS);
  });
  test("merges partial objects over defaults", () => {
    const p = coercePrefs({ wpm: 300, granularity: "word" });
    expect(p.wpm).toBe(300);
    expect(p.granularity).toBe("word");
    expect(p.style).toBe(DEFAULT_PREFS.style);
  });
  test("clamps wpm to [140,500]", () => {
    expect(coercePrefs({ wpm: 9999 }).wpm).toBe(500);
    expect(coercePrefs({ wpm: 10 }).wpm).toBe(140);
    expect(coercePrefs({ wpm: "x" }).wpm).toBe(DEFAULT_PREFS.wpm);
  });
  test("rejects invalid enum values", () => {
    expect(coercePrefs({ granularity: "paragraph" }).granularity).toBe(DEFAULT_PREFS.granularity);
    expect(coercePrefs({ style: "rainbow" }).style).toBe(DEFAULT_PREFS.style);
  });
  test("rejects non-hex colors", () => {
    expect(coercePrefs({ accent: "red" }).accent).toBe(DEFAULT_PREFS.accent);
    expect(coercePrefs({ accent: "#abc123" }).accent).toBe("#abc123");
  });
});
