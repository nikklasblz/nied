import type { QuizQuestion } from "@nied/schema";

/** Human-readable rendering of a question's correct answer, per type. */
export function answerText(q: QuizQuestion): string {
  switch (q.type) {
    case "single":
      return q.options[q.correct_index] ?? "";
    case "multiple":
      return q.correct_indices.map((i) => q.options[i]).join(", ");
    case "numeric":
      return `${q.answer}${q.unit ? ` ${q.unit}` : ""}${q.tolerance > 0 ? ` (±${q.tolerance})` : ""}`;
    case "short":
      return q.accepted[0] ?? "";
    case "matching":
      return q.pairs.map((p) => `${p.left} → ${p.right}`).join("; ");
    case "ordering":
      return q.items.join(" → ");
    default:
      return "";
  }
}
