import { z } from "zod";
import { UNIT_ID_RE, type Issue } from "./types";

const base = {
  question: z.string().min(1),
  explanation: z.string().min(1),
  section: z.string().optional(),
};

const singleQ = z.strictObject({
  type: z.literal("single"),
  ...base,
  options: z.array(z.string().min(1)).min(2),
  correct_index: z.number().int().nonnegative(),
});
const multipleQ = z.strictObject({
  type: z.literal("multiple"),
  ...base,
  options: z.array(z.string().min(1)).min(2),
  correct_indices: z.array(z.number().int().nonnegative()).min(1),
});
const numericQ = z.strictObject({
  type: z.literal("numeric"),
  ...base,
  answer: z.number(),
  tolerance: z.number().nonnegative().default(0),
  unit: z.string().optional(),
});
const shortQ = z.strictObject({
  type: z.literal("short"),
  ...base,
  accepted: z.array(z.string().min(1)).min(1),
});
const matchingQ = z.strictObject({
  type: z.literal("matching"),
  ...base,
  pairs: z.array(z.strictObject({ left: z.string().min(1), right: z.string().min(1) })).min(2),
});
const orderingQ = z.strictObject({
  type: z.literal("ordering"),
  ...base,
  items: z.array(z.string().min(1)).min(2),
});

const questionUnion = z.discriminatedUnion("type", [
  singleQ, multipleQ, numericQ, shortQ, matchingQ, orderingQ,
]);

/**
 * v2 question schema. Backward compatible: a question without `type` is
 * treated as `single` (the v1 shape). Cross-field constraints that the bare
 * union can't express are checked in superRefine.
 */
export const quizQuestionSchema = z.preprocess(
  (v) =>
    v && typeof v === "object" && !Array.isArray(v) && !("type" in (v as object))
      ? { ...(v as object), type: "single" }
      : v,
  questionUnion.superRefine((q, ctx) => {
    if (q.type === "single") {
      if (q.correct_index >= q.options.length)
        ctx.addIssue({ code: "custom", message: "correct_index out of range for options", path: ["correct_index"] });
      if (new Set(q.options).size !== q.options.length)
        ctx.addIssue({ code: "custom", message: "options must be unique", path: ["options"] });
    } else if (q.type === "multiple") {
      if (new Set(q.options).size !== q.options.length)
        ctx.addIssue({ code: "custom", message: "options must be unique", path: ["options"] });
      if (q.correct_indices.some((i) => i >= q.options.length))
        ctx.addIssue({ code: "custom", message: "correct_indices out of range for options", path: ["correct_indices"] });
      if (new Set(q.correct_indices).size !== q.correct_indices.length)
        ctx.addIssue({ code: "custom", message: "correct_indices must be unique", path: ["correct_indices"] });
    }
  })
);

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizSchema = z.strictObject({
  unit_id: z.string().regex(UNIT_ID_RE),
  title: z.string().min(1),
  instructions: z.string().min(1),
  xp_per_question: z.number().int().positive(),
  questions: z.array(quizQuestionSchema).min(1),
});

export type Quiz = z.infer<typeof quizSchema>;

/** Valida un quizzes/uN.json. expectedUnitId viene del nombre de archivo. */
export function validateQuizJson(
  content: string,
  expectedUnitId: string,
  file: string
): Issue[] {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return [{ file, severity: "error", message: "malformed JSON" }];
  }

  const parsed = quizSchema.safeParse(data);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      file,
      severity: "error" as const,
      message: `${i.path.join(".")}: ${i.message}`,
    }));
  }

  if (parsed.data.unit_id !== expectedUnitId) {
    return [
      {
        file,
        severity: "error",
        message: `unit_id "${parsed.data.unit_id}" does not match filename unit "${expectedUnitId}"`,
      },
    ];
  }

  return [];
}
