import { describe, expect, test, beforeAll } from "bun:test";
import { join } from "node:path";
import { loadQuiz } from "../content/quiz-loader";

beforeAll(() => {
  process.env.NIED_COURSES_ROOT = join(import.meta.dir, "..", "..", "..", "..", "schema", "test", "fixtures");
});

describe("loadQuiz", () => {
  test("loads schema v1 quiz with english keys", () => {
    const q = loadQuiz("valid-course", "u1");
    expect(q).not.toBeNull();
    expect(q!.unit_id).toBe("u1");
    expect(q!.questions.length).toBeGreaterThan(0);
    expect(typeof q!.questions[0]!.correct_index).toBe("number");
    expect(q!.xp_per_question).toBeGreaterThan(0);
  });

  test("null when quiz missing", () => {
    expect(loadQuiz("valid-course", "u2")).toBeNull();
  });

  test("null for invalid course id (traversal guard)", () => {
    expect(loadQuiz("../evil", "u1")).toBeNull();
  });
});
