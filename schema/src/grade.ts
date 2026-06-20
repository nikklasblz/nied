import type { QuizQuestion } from "./quiz";

/** A learner's answer, shape depends on the question type. */
export type QuizResponse = number | number[] | string;

/** Case/accent/space-insensitive normalization for short-answer grading. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number" && Number.isFinite(x));
}

/** Deterministic, all-or-nothing grading. Malformed responses return false. */
export function gradeQuestion(q: QuizQuestion, response: QuizResponse): boolean {
  try {
    switch (q.type) {
      case "single":
        return typeof response === "number" && response === q.correct_index;
      case "multiple": {
        if (!isNumberArray(response)) return false;
        const got = new Set(response);
        const want = new Set(q.correct_indices);
        return got.size === want.size && [...got].every((x) => want.has(x));
      }
      case "numeric":
        return typeof response === "number" && Number.isFinite(response) && Math.abs(response - q.answer) <= q.tolerance;
      case "short": {
        if (typeof response !== "string") return false;
        const n = normalizeText(response);
        return q.accepted.some((a) => normalizeText(a) === n);
      }
      case "matching": {
        if (!isNumberArray(response) || response.length !== q.pairs.length) return false;
        return response.every((v, i) => v === i);
      }
      case "ordering": {
        if (!isNumberArray(response) || response.length !== q.items.length) return false;
        return response.every((v, i) => v === i);
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}
