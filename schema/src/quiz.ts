import { z } from "zod";
import { UNIT_ID_RE, type Issue } from "./types";

// v1 is strict: unknown keys are authoring errors (mirrors courseSchema decision).
export const quizQuestionSchema = z
  .strictObject({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    correct_index: z.number().int().nonnegative(),
    explanation: z.string().min(1),
    section: z.string().optional(),
  })
  .refine((q) => q.correct_index < q.options.length, {
    message: "correct_index out of range for options",
  });

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
