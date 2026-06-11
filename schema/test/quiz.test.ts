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
    expect(issues[0]!.severity).toBe("error");
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
});
