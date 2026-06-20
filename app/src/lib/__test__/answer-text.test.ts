import { describe, expect, test } from "bun:test";
import { answerText } from "../quiz/answer-text";

describe("answerText", () => {
  test("single", () => expect(answerText({ type: "single", question: "q", explanation: "e", options: ["a", "b"], correct_index: 1 })).toBe("b"));
  test("multiple", () => expect(answerText({ type: "multiple", question: "q", explanation: "e", options: ["a", "b", "c"], correct_indices: [0, 2] })).toBe("a, c"));
  test("numeric with unit + tolerance", () => expect(answerText({ type: "numeric", question: "q", explanation: "e", answer: 5, tolerance: 0.1, unit: "kg" })).toBe("5 kg (±0.1)"));
  test("short", () => expect(answerText({ type: "short", question: "q", explanation: "e", accepted: ["media"] })).toBe("media"));
  test("matching", () => expect(answerText({ type: "matching", question: "q", explanation: "e", pairs: [{ left: "a", right: "1" }, { left: "b", right: "2" }] })).toBe("a → 1; b → 2"));
  test("ordering", () => expect(answerText({ type: "ordering", question: "q", explanation: "e", items: ["x", "y"] })).toBe("x → y"));
});
