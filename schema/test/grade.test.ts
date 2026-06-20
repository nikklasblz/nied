import { describe, expect, test } from "bun:test";
import { gradeQuestion, normalizeText } from "../src/grade";

describe("normalizeText", () => {
  test("strips accents, case, trims, collapses spaces", () => {
    expect(normalizeText("  Árbol   ROJO ")).toBe("arbol rojo");
  });
});

describe("gradeQuestion", () => {
  const single = { type: "single", question: "q", explanation: "e", options: ["a", "b"], correct_index: 1 } as const;
  const multiple = { type: "multiple", question: "q", explanation: "e", options: ["a", "b", "c"], correct_indices: [0, 2] } as const;
  const numeric = { type: "numeric", question: "q", explanation: "e", answer: 3.14, tolerance: 0.01 } as const;
  const short = { type: "short", question: "q", explanation: "e", accepted: ["media", "promedio"] } as const;
  const matching = { type: "matching", question: "q", explanation: "e", pairs: [{ left: "a", right: "1" }, { left: "b", right: "2" }] } as const;
  const ordering = { type: "ordering", question: "q", explanation: "e", items: ["x", "y", "z"] } as const;

  test("single", () => {
    expect(gradeQuestion(single, 1)).toBe(true);
    expect(gradeQuestion(single, 0)).toBe(false);
    expect(gradeQuestion(single, "1" as never)).toBe(false);
  });
  test("multiple: set equality, order irrelevant", () => {
    expect(gradeQuestion(multiple, [2, 0])).toBe(true);
    expect(gradeQuestion(multiple, [0])).toBe(false);
    expect(gradeQuestion(multiple, [0, 1, 2])).toBe(false);
  });
  test("numeric: tolerance", () => {
    expect(gradeQuestion(numeric, 3.15)).toBe(true);
    expect(gradeQuestion(numeric, 3.2)).toBe(false);
    expect(gradeQuestion(numeric, NaN)).toBe(false);
  });
  test("short: normalized membership", () => {
    expect(gradeQuestion(short, "  Promedio ")).toBe(true);
    expect(gradeQuestion(short, "moda")).toBe(false);
  });
  test("matching: identity mapping correct", () => {
    expect(gradeQuestion(matching, [0, 1])).toBe(true);
    expect(gradeQuestion(matching, [1, 0])).toBe(false);
    expect(gradeQuestion(matching, [0])).toBe(false);
  });
  test("ordering: must equal authored order", () => {
    expect(gradeQuestion(ordering, [0, 1, 2])).toBe(true);
    expect(gradeQuestion(ordering, [2, 1, 0])).toBe(false);
  });
  test("malformed response returns false, never throws", () => {
    expect(gradeQuestion(multiple, "nope" as never)).toBe(false);
    expect(gradeQuestion(ordering, [0, "y" as never, 2])).toBe(false);
  });
});
