import { describe, expect, test } from "bun:test";
import { validateQuizJson } from "../src/quiz";

const valid = JSON.stringify({
  unit_id: "u1",
  title: "Quiz u1",
  instructions: "Responde sin mirar el material.",
  xp_per_question: 10,
  questions: [
    {
      question: "¿2+2?",
      options: ["3", "4"],
      correct_index: 1,
      explanation: "Aritmética básica.",
    },
  ],
});

describe("validateQuizJson", () => {
  test("valid quiz -> no issues", () => {
    expect(validateQuizJson(valid, "u1", "quizzes/u1.json")).toEqual([]);
  });

  test("malformed JSON -> error", () => {
    const issues = validateQuizJson("{nope", "u1", "quizzes/u1.json");
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toBe("malformed JSON");
  });

  test("correct_index out of range -> error", () => {
    const bad = valid.replace(`"correct_index":1`, `"correct_index":5`);
    const issues = validateQuizJson(bad, "u1", "quizzes/u1.json");
    expect(issues.some((i) => i.message.includes("correct_index"))).toBe(true);
  });

  test("unit_id mismatch with filename -> error", () => {
    const issues = validateQuizJson(valid, "u2", "quizzes/u2.json");
    expect(issues.some((i) => i.message.includes("unit_id"))).toBe(true);
  });

  test("fewer than 2 options -> error", () => {
    const bad = valid.replace(`["3","4"]`, `["4"]`);
    const issues = validateQuizJson(bad, "u1", "quizzes/u1.json");
    expect(issues.length).toBeGreaterThan(0);
  });

  test("unknown key -> error (strict contract)", () => {
    const bad = valid.replace(`"title":`, `"titel": "x", "title":`);
    const issues = validateQuizJson(bad, "u1", "quizzes/u1.json");
    expect(issues.length).toBeGreaterThan(0);
  });

  test("section field is optional and accepted", () => {
    const withSection = JSON.parse(valid);
    withSection.questions[0].section = "Sección 1";
    expect(validateQuizJson(JSON.stringify(withSection), "u1", "quizzes/u1.json")).toEqual([]);
  });

  // Boundary tests
  test("unit_id 'u0' is rejected", () => {
    const bad = JSON.stringify({ ...JSON.parse(valid), unit_id: "u0" });
    const issues = validateQuizJson(bad, "u0", "quizzes/u0.json");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.message.includes("unit_id"))).toBe(true);
  });

  test("xp_per_question 0 is rejected", () => {
    const bad = JSON.stringify({ ...JSON.parse(valid), xp_per_question: 0 });
    const issues = validateQuizJson(bad, "u1", "quizzes/u1.json");
    expect(issues.length).toBeGreaterThan(0);
  });

  test("correct_index 0 is accepted (first option)", () => {
    const fixture = JSON.parse(valid);
    fixture.questions[0].correct_index = 0;
    const issues = validateQuizJson(JSON.stringify(fixture), "u1", "quizzes/u1.json");
    expect(issues).toEqual([]);
  });

  test("duplicate options are rejected", () => {
    const fixture = JSON.parse(valid);
    fixture.questions[0].options = ["same", "same"];
    const issues = validateQuizJson(JSON.stringify(fixture), "u1", "quizzes/u1.json");
    expect(issues.some((i) => i.message.includes("options"))).toBe(true);
  });
});

import { quizQuestionSchema } from "../src/quiz";

describe("quizQuestionSchema v2", () => {
  test("v1 question without type defaults to single", () => {
    const r = quizQuestionSchema.safeParse({
      question: "q", explanation: "e", options: ["a", "b"], correct_index: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.type).toBe("single");
  });
  test("single: correct_index out of range fails", () => {
    expect(quizQuestionSchema.safeParse({
      type: "single", question: "q", explanation: "e", options: ["a", "b"], correct_index: 2,
    }).success).toBe(false);
  });
  test("multiple requires non-empty correct_indices in range", () => {
    expect(quizQuestionSchema.safeParse({
      type: "multiple", question: "q", explanation: "e", options: ["a", "b", "c"], correct_indices: [0, 2],
    }).success).toBe(true);
    expect(quizQuestionSchema.safeParse({
      type: "multiple", question: "q", explanation: "e", options: ["a", "b"], correct_indices: [5],
    }).success).toBe(false);
  });
  test("numeric defaults tolerance to 0", () => {
    const r = quizQuestionSchema.safeParse({
      type: "numeric", question: "q", explanation: "e", answer: 3.14,
    });
    expect(r.success).toBe(true);
    if (r.success && r.data.type === "numeric") expect(r.data.tolerance).toBe(0);
  });
  test("short requires at least one accepted", () => {
    expect(quizQuestionSchema.safeParse({
      type: "short", question: "q", explanation: "e", accepted: [],
    }).success).toBe(false);
  });
  test("matching requires >=2 pairs", () => {
    expect(quizQuestionSchema.safeParse({
      type: "matching", question: "q", explanation: "e",
      pairs: [{ left: "a", right: "1" }, { left: "b", right: "2" }],
    }).success).toBe(true);
  });
  test("ordering requires >=2 items", () => {
    expect(quizQuestionSchema.safeParse({
      type: "ordering", question: "q", explanation: "e", items: ["a", "b", "c"],
    }).success).toBe(true);
    expect(quizQuestionSchema.safeParse({
      type: "ordering", question: "q", explanation: "e", items: ["a"],
    }).success).toBe(false);
  });
  test("unknown type fails", () => {
    expect(quizQuestionSchema.safeParse({
      type: "essay", question: "q", explanation: "e",
    }).success).toBe(false);
  });
});
