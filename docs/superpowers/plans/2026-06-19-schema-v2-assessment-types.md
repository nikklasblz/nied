# Schema v2 — Assessment Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five new auto-gradable quiz question types (multiple, numeric, short, matching, ordering) to nied as a discriminated union with full backward-compatibility for v1 single-choice quizzes, a pure shared grader, all-or-nothing scoring, per-type UI, and plugin support.

**Architecture:** A pure, unit-tested core in `@nied/schema` (discriminated union + `gradeQuestion`). The app sends a typed `response` to a server action that grades with `gradeQuestion` (XP/streak/SRS unchanged). The quiz UI renders one focused input component per type. Plugin docs/agents learn the new contract.

**Tech Stack:** TypeScript, Zod 4, bun (`bun:test`), Next.js 16 (App Router, server + client components), better-sqlite3, Playwright (MCP) for smoke.

**Conventions:**
- Schema package: run tests from `D:\nied\schema` with `bun test`. App: `bun test src/lib/__test__` and typecheck `bunx tsc --noEmit` from `D:\nied\app`.
- i18n is server-side (`t()`); client components receive `labels` via props.
- All UI strings via i18n; code in English. Work on branch `feat/schema-v2` (already created, holds the spec).
- Commit after every task.

**Phasing (run straight through, review via commits):**
- **A** — schema union + grader (pure).
- **B** — app grading + DB + numeric end-to-end.
- **C** — remaining UI types (multiple, short, matching, ordering) + seeded shuffle.
- **D** — plugin (methodology/writer/auditor) + demo quiz + smoke.

---

## File Structure

**Schema package (`D:\nied\schema`):**
- `src/quiz.ts` (modify) — discriminated union, backward-compat preprocess, `QuizQuestion` type.
- `src/grade.ts` (new) — `gradeQuestion`, `normalizeText`, response types.
- `src/types.ts` (modify) — `schema_version` accepts `1 | 2`.
- `src/index.ts` (modify) — export grader + types.
- `test/quiz.test.ts` (modify), `test/grade.test.ts` (new).

**App (`D:\nied\app`):**
- `src/lib/db/schema.ts` (modify) — `quiz_attempts.response TEXT`.
- `src/lib/db/queries/quiz.ts` (modify) — `response` column.
- `src/app/actions/quiz.ts` (modify) — `response` param, `gradeQuestion`.
- `src/lib/quiz/seeded-shuffle.ts` (new) — deterministic shuffle.
- `src/components/quiz-section.tsx` (modify) — orchestrate per-type.
- `src/components/quiz-inputs/{single,multiple,numeric,short,matching,ordering}.tsx` (new) — one input per type.
- `src/components/quiz-inputs/types.ts` (new) — shared input props.
- `src/lib/i18n/{es,en}.json` (modify) — new strings.
- tests under `src/lib/__test__/`.

**Plugin (`D:\nied\plugin`):**
- `skills/methodology/SKILL.md`, `agents/course-writer.md`, `agents/course-auditor.md` (modify).
- `courses/estadistica-aplicada/quizzes/` (a demo quiz exercising new types, for smoke — kept local if needed).

---

# PHASE A — Schema union + grader (pure)

## Task A1: Discriminated-union question schema with backward compat

**Files:**
- Modify: `D:\nied\schema\src\quiz.ts`
- Test: `D:\nied\schema\test\quiz.test.ts`

- [ ] **Step 1: Write failing tests** (append to existing `test/quiz.test.ts`; keep existing tests)

```ts
import { describe, expect, test } from "bun:test";
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /d/nied/schema && bun test test/quiz.test.ts`
Expected: FAIL (new v2 tests fail; `data.type` undefined / multiple type rejected).

- [ ] **Step 3: Replace the question schema in `src/quiz.ts`** (keep `quizSchema`, `validateQuizJson` working; replace ONLY the `quizQuestionSchema` definition block)

```ts
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
```

Then keep the rest of the file unchanged below (the `quizSchema` object and `validateQuizJson` function — they already reference `quizQuestionSchema`). Verify the existing `quizSchema` still reads:

```ts
export const quizSchema = z.strictObject({
  unit_id: z.string().regex(UNIT_ID_RE),
  title: z.string().min(1),
  instructions: z.string().min(1),
  xp_per_question: z.number().int().positive(),
  questions: z.array(quizQuestionSchema).min(1),
});
export type Quiz = z.infer<typeof quizSchema>;
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd /d/nied/schema && bun test`
Expected: PASS (new v2 tests + all existing schema tests, including the v1 fixture).

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add schema/src/quiz.ts schema/test/quiz.test.ts && git commit -m "feat(schema): v2 discriminated-union question types (backward-compatible)"
```

---

## Task A2: Pure grader + text normalization

**Files:**
- Create: `D:\nied\schema\src\grade.ts`
- Test: `D:\nied\schema\test\grade.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run to verify fail**

Run: `cd /d/nied/schema && bun test test/grade.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/grade.ts`**

```ts
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
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /d/nied/schema && bun test test/grade.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add schema/src/grade.ts schema/test/grade.test.ts && git commit -m "feat(schema): pure gradeQuestion + normalizeText"
```

---

## Task A3: schema_version 1|2 + package exports

**Files:**
- Modify: `D:\nied\schema\src\types.ts`
- Modify: `D:\nied\schema\src\index.ts`
- Test: `D:\nied\schema\test\quiz.test.ts` (append)

- [ ] **Step 1: Write failing test** (append to `test/quiz.test.ts`)

```ts
import { courseSchema } from "../src/types";
import { gradeQuestion as gradeFromIndex } from "../src/index";

describe("schema_version 1|2 + exports", () => {
  const baseCourse = {
    slug: "c", title: "C", language: "es", level: "intro", description: "d",
    units: [{ id: "u1", title: "U", objectives: ["o"], hours: 1 }],
  };
  test("accepts schema_version 1 and 2", () => {
    expect(courseSchema.safeParse({ ...baseCourse, schema_version: 1 }).success).toBe(true);
    expect(courseSchema.safeParse({ ...baseCourse, schema_version: 2 }).success).toBe(true);
    expect(courseSchema.safeParse({ ...baseCourse, schema_version: 3 }).success).toBe(false);
  });
  test("gradeQuestion is exported from package index", () => {
    expect(typeof gradeFromIndex).toBe("function");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd /d/nied/schema && bun test test/quiz.test.ts`
Expected: FAIL (schema_version 2 rejected and/or `gradeFromIndex` undefined).

- [ ] **Step 3: Edit `src/types.ts`** — change the `schema_version` line in `courseSchema` from:

```ts
  schema_version: z.literal(1),
```
to:
```ts
  schema_version: z.union([z.literal(1), z.literal(2)]),
```

- [ ] **Step 4: Edit `src/index.ts`** — add the grader export and the `QuizQuestion` type. Replace the quiz export line with:

```ts
export { quizSchema, quizQuestionSchema, type Quiz, type QuizQuestion, validateQuizJson } from "./quiz";
export { gradeQuestion, normalizeText, type QuizResponse } from "./grade";
```

- [ ] **Step 5: Run to verify pass**

Run: `cd /d/nied/schema && bun test`
Expected: PASS (all schema tests).

- [ ] **Step 6: Commit**

```bash
cd /d/nied && git add schema/src/types.ts schema/src/index.ts schema/test/quiz.test.ts && git commit -m "feat(schema): schema_version 1|2, export grader + QuizQuestion"
```

---

# PHASE B — App grading + DB + numeric end-to-end

## Task B1: DB column `selected_answer` → `response` (TEXT)

**Files:**
- Modify: `D:\nied\app\src\lib\db\schema.ts`
- Modify: `D:\nied\app\src\lib\db\queries\quiz.ts`

The DB is disposable (gitignored, recreated on demand); there is no migration — we change the CREATE statement and delete the existing db files so they recreate.

- [ ] **Step 1: Edit `src/lib/db/schema.ts`** — in the `quiz_attempts` CREATE TABLE, change:

```sql
    selected_answer INTEGER NOT NULL,
```
to:
```sql
    response TEXT NOT NULL,
```

- [ ] **Step 2: Edit `src/lib/db/queries/quiz.ts`** — replace the file's `QuizAttemptRow` interface and `insertQuizAttempt` to use `response: string`:

```ts
export interface QuizAttemptRow {
  id: number;
  course_id: string;
  unit_id: string;
  question_index: number;
  response: string;
  correct: number;
  xp_awarded: number;
  attempted_at: string;
}
```
and the insert:
```ts
export function insertQuizAttempt(
  db: Database.Database,
  data: {
    courseId: string;
    unitId: string;
    questionIndex: number;
    response: string;
    correct: boolean;
    xpAwarded: number;
  }
): void {
  db.prepare(
    `INSERT INTO quiz_attempts (course_id, unit_id, question_index, response, correct, xp_awarded)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    data.courseId,
    data.unitId,
    data.questionIndex,
    data.response,
    data.correct ? 1 : 0,
    data.xpAwarded
  );
}
```
(`getQuizAttempts` and `hasAttemptedQuestion` stay as-is — `SELECT *` and the `correct = 1` check don't reference the renamed column.)

- [ ] **Step 3: Delete the disposable db files so the new schema recreates**

Run (bash):
```bash
rm -f /d/nied/app/db/nied.db /d/nied/app/db/nied.db-shm /d/nied/app/db/nied.db-wal /d/nied/app/db/smoke.db /d/nied/app/db/smoke.db-shm /d/nied/app/db/smoke.db-wal
```
Expected: no error (files removed or already absent).

- [ ] **Step 4: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: errors ONLY in `actions/quiz.ts` (still passes `selectedAnswer`) — that's fixed in Task B2. If other files error, stop and report.

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add app/src/lib/db/schema.ts app/src/lib/db/queries/quiz.ts && git commit -m "feat(db): quiz_attempts stores JSON response instead of selected_answer"
```

---

## Task B2: Server action grades any type via `gradeQuestion`

**Files:**
- Modify: `D:\nied\app\src\app\actions\quiz.ts`

- [ ] **Step 1: Replace `src/app/actions/quiz.ts`** with:

```ts
"use server";

/**
 * Server action: processes a quiz answer of any type.
 * Loads the quiz server-side (never trusts the client), grades with the pure
 * gradeQuestion, then (if correct) touches the streak, applies the multiplier,
 * inserts the XP event, records the attempt, and creates an SRS card.
 */

import { revalidatePath } from "next/cache";
import { gradeQuestion, type QuizResponse } from "@nied/schema";
import { getDb } from "@/lib/db/client";
import { insertQuizAttempt, hasAttemptedQuestion } from "@/lib/db/queries/quiz";
import { insertXpEvent } from "@/lib/db/queries/xp";
import { upsertCard } from "@/lib/db/queries/srs";
import { nextDueDate } from "@/lib/srs/leitner";
import { recordActivity, toIsoDate } from "@/lib/gamification/streaks";
import { applyMultiplier } from "@/lib/gamification/xp";
import { loadQuiz } from "@/lib/content/quiz-loader";

export type SubmitQuizAnswerResult = {
  correct: boolean;
  explanation: string;
  xpAwarded: number;
  alreadyAnswered: boolean;
};

export async function submitQuizAnswer(
  courseId: string,
  unitId: string,
  questionIndex: number,
  response: QuizResponse
): Promise<SubmitQuizAnswerResult> {
  const quiz = loadQuiz(courseId, unitId);
  if (!quiz) throw new Error(`Quiz no encontrado: ${courseId}/${unitId}`);
  const q = quiz.questions[questionIndex];
  if (!q) throw new Error(`Pregunta fuera de rango: índice ${questionIndex}`);

  const db = getDb();
  const correct = gradeQuestion(q, response);

  const already = hasAttemptedQuestion(db, courseId, unitId, questionIndex);
  if (already) {
    return { correct, explanation: q.explanation, xpAwarded: 0, alreadyAnswered: true };
  }

  const xpBase = correct ? quiz.xp_per_question : 0;

  const result = db.transaction(() => {
    const today = toIsoDate(new Date());
    const streak = recordActivity(db, today);
    const finalXp = correct ? applyMultiplier(xpBase, streak.multiplier) : 0;

    insertQuizAttempt(db, {
      courseId,
      unitId,
      questionIndex,
      response: JSON.stringify(response),
      correct,
      xpAwarded: finalXp,
    });

    upsertCard(db, courseId, unitId, questionIndex, nextDueDate(1, today));

    if (correct && finalXp > 0) {
      insertXpEvent(db, {
        activity: "quiz-correct",
        courseId,
        unitId,
        xp: finalXp,
        multiplier: streak.multiplier,
      });
    }
    return { finalXp, multiplier: streak.multiplier };
  })();

  try {
    revalidatePath("/");
    revalidatePath(`/courses/${courseId}/${unitId}`);
  } catch {
    /* revalidatePath may fail outside a render context — ignore */
  }

  return { correct, explanation: q.explanation, xpAwarded: result.finalXp, alreadyAnswered: false };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: errors ONLY in `quiz-section.tsx` (still passes a number to `submitQuizAnswer` / reads `correct_index`) — fixed in Task B3.

- [ ] **Step 3: Commit**

```bash
cd /d/nied && git add app/src/app/actions/quiz.ts && git commit -m "feat(quiz): grade any response type server-side via gradeQuestion"
```

---

## Task B3: Quiz UI orchestration + single & numeric inputs

**Files:**
- Create: `D:\nied\app\src\components\quiz-inputs\types.ts`
- Create: `D:\nied\app\src\components\quiz-inputs\single.tsx`
- Create: `D:\nied\app\src\components\quiz-inputs\numeric.tsx`
- Modify: `D:\nied\app\src\components\quiz-section.tsx`
- Modify: `D:\nied\app\src\lib\i18n\es.json`, `en.json`

This refactors `QuizQuestion` to (a) hold a per-type `response`, (b) render the input for the question's `type`, (c) submit `response`, (d) reveal the correct answer per type. Phase B wires `single` (port of the existing UI) and `numeric`; later phases add the rest.

- [ ] **Step 1: Add i18n keys** to BOTH `es.json` and `en.json` (anchor after `"quiz.xpPerQuestion"` — find it; keep parity). ES:

```json
  "quiz.submit": "Responder",
  "quiz.yourAnswer": "Tu respuesta",
  "quiz.correctIs": "Respuesta correcta",
  "quiz.numericPlaceholder": "Escribe un número",
  "quiz.shortPlaceholder": "Escribe tu respuesta",
  "quiz.selectMatch": "Elige…",
  "quiz.multipleHint": "Marca todas las que apliquen",
  "quiz.orderingHint": "Arrastra para ordenar",
  "quiz.moveUp": "Subir",
  "quiz.moveDown": "Bajar"
```
EN:
```json
  "quiz.submit": "Submit",
  "quiz.yourAnswer": "Your answer",
  "quiz.correctIs": "Correct answer",
  "quiz.numericPlaceholder": "Enter a number",
  "quiz.shortPlaceholder": "Type your answer",
  "quiz.selectMatch": "Choose…",
  "quiz.multipleHint": "Select all that apply",
  "quiz.orderingHint": "Drag to reorder",
  "quiz.moveUp": "Move up",
  "quiz.moveDown": "Move down"
```

- [ ] **Step 2: Create `src/components/quiz-inputs/types.ts`**

```ts
import type { QuizQuestion, QuizResponse } from "@nied/schema";

export type QuizInputLabels = {
  submit: string;
  yourAnswer: string;
  correctIs: string;
  numericPlaceholder: string;
  shortPlaceholder: string;
  selectMatch: string;
  multipleHint: string;
  orderingHint: string;
  moveUp: string;
  moveDown: string;
};

/** Props shared by every per-type input component. */
export interface QuizInputProps<Q extends QuizQuestion = QuizQuestion> {
  question: Q;
  /** Current draft response (null until the learner picks something). */
  value: QuizResponse | null;
  /** Report a new draft response to the parent. */
  onChange: (response: QuizResponse) => void;
  /** True once submitted — inputs become read-only and reveal the answer. */
  submitted: boolean;
  /** Whether the submitted answer was correct (for styling); null pre-submit. */
  correct: boolean | null;
  /** Stable seed for deterministic shuffles (the question index). */
  seed: number;
  labels: QuizInputLabels;
}
```

- [ ] **Step 3: Create `src/components/quiz-inputs/single.tsx`** (port of the existing option UI)

```tsx
"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "@/components/icons";
import type { QuizInputProps } from "./types";

export function SingleInput({ question, value, onChange, submitted }: QuizInputProps) {
  if (question.type !== "single") return null;
  const selected = typeof value === "number" ? value : null;
  return (
    <div className="flex flex-col gap-2">
      {question.options.map((option, optIdx) => {
        const isSelected = selected === optIdx;
        const isCorrect = optIdx === question.correct_index;
        return (
          <button
            key={optIdx}
            type="button"
            onClick={() => !submitted && onChange(optIdx)}
            disabled={submitted}
            className={cn(
              "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150",
              !submitted && !isSelected && "border-border bg-bg-overlay hover:bg-bg-elevated text-fg-secondary hover:text-fg-primary",
              !submitted && isSelected && "border-accent-primary/60 bg-accent-primary/10 text-fg-primary ring-2 ring-accent-primary/40",
              submitted && isCorrect && "border-success/60 bg-success/10 text-fg-primary",
              submitted && isSelected && !isCorrect && "border-danger/60 bg-danger/10 text-fg-primary",
              submitted && !isSelected && !isCorrect && "border-border/50 bg-bg-overlay/50 text-fg-muted opacity-60"
            )}
          >
            <span className="flex items-center gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]">
                {String.fromCharCode(65 + optIdx)}
              </span>
              <span className="leading-snug">{option}</span>
              {submitted && isCorrect && <CheckCircle2 className="ml-auto size-4 text-success" />}
              {submitted && isSelected && !isCorrect && <XCircle className="ml-auto size-4 text-danger" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/quiz-inputs/numeric.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { QuizInputProps } from "./types";

export function NumericInput({ question, value, onChange, submitted, correct, labels }: QuizInputProps) {
  if (question.type !== "numeric") return null;
  const v = typeof value === "number" ? String(value) : "";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={v}
          disabled={submitted}
          placeholder={labels.numericPlaceholder}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
          }}
          className={cn(
            "w-40 rounded-lg border bg-bg-overlay px-3 py-2 text-sm text-fg-primary outline-none",
            !submitted && "border-border focus:border-accent-primary",
            submitted && correct && "border-success/60",
            submitted && correct === false && "border-danger/60"
          )}
        />
        {question.unit && <span className="text-sm text-fg-secondary">{question.unit}</span>}
      </div>
      {submitted && (
        <p className="text-xs text-fg-muted">
          {labels.correctIs}: <span className="text-fg-primary">{question.answer}{question.unit ? ` ${question.unit}` : ""}</span>
          {question.tolerance > 0 ? ` (±${question.tolerance})` : ""}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `src/components/quiz-section.tsx`** to orchestrate by type. Replace the whole file with:

```tsx
"use client";

/**
 * QuizSection — auto-graded quiz for niED. Renders one input per question type
 * and submits the typed response to the server action for grading.
 */

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, HelpCircle, Zap } from "@/components/icons";
import { submitQuizAnswer } from "@/app/actions/quiz";
import type { Quiz, QuizResponse } from "@nied/schema";
import { SingleInput } from "@/components/quiz-inputs/single";
import { NumericInput } from "@/components/quiz-inputs/numeric";
import type { QuizInputLabels, QuizInputProps } from "@/components/quiz-inputs/types";

export type QuizLabels = QuizInputLabels & {
  aria: string;
  title: string;
  completed: string;
  check: string;
  checking: string;
  done: string;
  correctAnswer: string;
  xpPerQuestion: string;
};

interface QuizSectionProps {
  courseId: string;
  unitId: string;
  quiz: Quiz;
  previousAttempts: { questionIndex: number; correct: boolean }[];
  labels: QuizLabels;
}

interface QState {
  response: QuizResponse | null;
  submitted: boolean;
  correct: boolean | null;
  explanation: string | null;
  xpAwarded: number;
}

function renderInput(props: QuizInputProps) {
  switch (props.question.type) {
    case "single": return <SingleInput {...props} />;
    case "numeric": return <NumericInput {...props} />;
    // multiple/short/matching/ordering added in Phase C
    default: return null;
  }
}

function QuizQuestionView({
  question, index, totalQuestions, courseId, unitId, xpPerQuestion, initialState, labels,
}: {
  question: Quiz["questions"][number];
  index: number;
  totalQuestions: number;
  courseId: string;
  unitId: string;
  xpPerQuestion: number;
  initialState: QState;
  labels: QuizLabels;
}) {
  const [state, setState] = useState<QState>(initialState);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (state.response === null || state.submitted) return;
    startTransition(async () => {
      const result = await submitQuizAnswer(courseId, unitId, index, state.response!);
      setState((p) => ({ ...p, submitted: true, correct: result.correct, explanation: result.explanation, xpAwarded: result.xpAwarded }));
      if (result.correct && result.xpAwarded > 0) {
        toast.custom(() => (
          <div className="flex items-center gap-3 rounded-xl border border-accent-primary/40 bg-popover px-4 py-3 shadow-xp-glow">
            <Zap className="size-5 text-accent-primary" strokeWidth={2} aria-hidden />
            <span className="font-mono text-base font-semibold text-accent-primary">+{result.xpAwarded} XP</span>
          </div>
        ), { duration: 2800 });
      }
    });
  };

  return (
    <div className={cn(
      "rounded-xl border bg-bg-elevated p-5 transition-colors",
      state.submitted && state.correct ? "border-success/50" : state.submitted && !state.correct ? "border-danger/50" : "border-border"
    )}>
      <div className="mb-4 flex items-start gap-3">
        <span className="shrink-0 rounded-lg bg-bg-overlay px-2 py-0.5 font-mono text-[11px] text-fg-muted">{index + 1}/{totalQuestions}</span>
        <div className="flex-1">
          {question.section && <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">{question.section.replace(/^#+\s*/, "")}</p>}
          <p className="text-sm font-medium leading-relaxed text-fg-primary">{question.question}</p>
        </div>
      </div>

      {renderInput({
        question,
        value: state.response,
        onChange: (r) => setState((p) => ({ ...p, response: r })),
        submitted: state.submitted,
        correct: state.correct,
        seed: index,
        labels,
      })}

      <AnimatePresence>
        {state.submitted && state.explanation && (
          <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 12 }} className="overflow-hidden">
            <div className={cn("rounded-lg border px-4 py-3", state.correct ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10")}>
              <div className="flex items-start gap-2">
                {state.correct ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : <HelpCircle className="mt-0.5 size-4 text-danger" />}
                <p className={cn("text-sm italic leading-relaxed", state.correct ? "text-success" : "text-danger")}>{state.explanation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!state.submitted && (
        <div className="mt-4">
          <button
            onClick={submit}
            disabled={state.response === null || isPending}
            className="rounded-lg bg-accent-primary px-5 py-2 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? labels.checking : labels.submit}
          </button>
        </div>
      )}
    </div>
  );
}

export function QuizSection({ courseId, unitId, quiz, previousAttempts, labels }: QuizSectionProps) {
  const attemptMap = new Map<number, boolean>();
  for (const a of previousAttempts) attemptMap.set(a.questionIndex, a.correct);

  const buildInitial = (idx: number): QState => {
    const wasCorrect = attemptMap.get(idx);
    if (wasCorrect !== undefined) {
      return { response: null, submitted: true, correct: wasCorrect, explanation: quiz.questions[idx].explanation, xpAwarded: 0 };
    }
    return { response: null, submitted: false, correct: null, explanation: null, xpAwarded: 0 };
  };

  const totalCompleted = previousAttempts.length;
  const totalQuestions = quiz.questions.length;

  return (
    <section aria-label={labels.aria} className="rounded-xl border border-border bg-card/60 px-5 py-5">
      <div className="mb-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{labels.title}</h2>
          {totalCompleted > 0 && <span className="font-mono text-[11px] text-fg-secondary">{totalCompleted}/{totalQuestions} {labels.completed}</span>}
        </div>
        <p className="text-base font-semibold text-fg-primary">{quiz.title}</p>
        <p className="text-sm text-fg-secondary">{quiz.instructions}</p>
        <div className="flex items-center gap-1.5 font-mono text-xs text-accent-primary">
          <Zap className="size-3" strokeWidth={2} aria-hidden />
          <span>{quiz.xp_per_question} {labels.xpPerQuestion}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, idx) => (
          <QuizQuestionView
            key={idx}
            question={q}
            index={idx}
            totalQuestions={totalQuestions}
            courseId={courseId}
            unitId={unitId}
            xpPerQuestion={quiz.xp_per_question}
            initialState={buildInitial(idx)}
            labels={labels}
          />
        ))}
      </div>

      <AnimatePresence>
        {totalCompleted === totalQuestions && totalQuestions > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
            <CheckCircle2 className="size-4 text-success" />
            <p className="text-sm font-medium text-success">{labels.done}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```

- [ ] **Step 6: Update the unit page's `QuizSection` labels** in `src/app/courses/[id]/[unit]/page.tsx`. Find the `labels={{ ... }}` passed to `<QuizSection>` and add the new keys (the input labels). Replace the QuizSection `labels` object with:

```tsx
              labels={{
                aria: t("quiz.aria"),
                title: t("quiz.title"),
                completed: t("quiz.completed"),
                check: t("quiz.check"),
                checking: t("quiz.checking"),
                done: t("quiz.done"),
                correctAnswer: t("quiz.correctAnswer"),
                xpPerQuestion: t("quiz.xpPerQuestion"),
                submit: t("quiz.submit"),
                yourAnswer: t("quiz.yourAnswer"),
                correctIs: t("quiz.correctIs"),
                numericPlaceholder: t("quiz.numericPlaceholder"),
                shortPlaceholder: t("quiz.shortPlaceholder"),
                selectMatch: t("quiz.selectMatch"),
                multipleHint: t("quiz.multipleHint"),
                orderingHint: t("quiz.orderingHint"),
                moveUp: t("quiz.moveUp"),
                moveDown: t("quiz.moveDown"),
              }}
```

- [ ] **Step 7: Typecheck + i18n parity**

Run: `cd /d/nied/app && bunx tsc --noEmit && bun test src/lib/__test__/i18n.test.ts`
Expected: tsc clean; i18n parity passes.

- [ ] **Step 8: Commit**

```bash
cd /d/nied && git add app/src/components/quiz-inputs app/src/components/quiz-section.tsx app/src/lib/i18n app/src/app/courses && git commit -m "feat(quiz): per-type UI orchestration + single & numeric inputs"
```

---

# PHASE C — Remaining UI types

## Task C1: Deterministic seeded shuffle

**Files:**
- Create: `D:\nied\app\src\lib\quiz\seeded-shuffle.ts`
- Test: `D:\nied\app\src\lib\__test__\seeded-shuffle.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, test } from "bun:test";
import { seededShuffle } from "../quiz/seeded-shuffle";

describe("seededShuffle", () => {
  test("is a permutation of indices", () => {
    const order = seededShuffle(5, 3);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });
  test("is deterministic for the same seed", () => {
    expect(seededShuffle(6, 42)).toEqual(seededShuffle(6, 42));
  });
  test("differs across seeds (usually) and handles n<=1", () => {
    expect(seededShuffle(1, 1)).toEqual([0]);
    expect(seededShuffle(0, 1)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd /d/nied/app && bun test src/lib/__test__/seeded-shuffle.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/quiz/seeded-shuffle.ts`**

```ts
/**
 * Deterministic Fisher–Yates that returns a permutation of [0..n-1].
 * Same (n, seed) → same order, on server and client (no hydration mismatch).
 * Uses a tiny mulberry32 PRNG; no Math.random.
 */
export function seededShuffle(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = (seed >>> 0) || 1;
  const rand = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd /d/nied/app && bun test src/lib/__test__/seeded-shuffle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add app/src/lib/quiz/seeded-shuffle.ts app/src/lib/__test__/seeded-shuffle.test.ts && git commit -m "feat(quiz): deterministic seeded shuffle"
```

---

## Task C2: Multiple-choice (checkboxes) input

**Files:**
- Create: `D:\nied\app\src\components\quiz-inputs\multiple.tsx`
- Modify: `D:\nied\app\src\components\quiz-section.tsx` (wire into `renderInput`)

- [ ] **Step 1: Create `src/components/quiz-inputs/multiple.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "@/components/icons";
import type { QuizInputProps } from "./types";

export function MultipleInput({ question, value, onChange, submitted, labels }: QuizInputProps) {
  if (question.type !== "multiple") return null;
  const selected = Array.isArray(value) ? (value as number[]) : [];
  const toggle = (i: number) => {
    if (submitted) return;
    onChange(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i].sort((a, b) => a - b));
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">{labels.multipleHint}</p>
      {question.options.map((option, i) => {
        const isSel = selected.includes(i);
        const isCorrect = question.correct_indices.includes(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            disabled={submitted}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
              !submitted && isSel && "border-accent-primary/60 bg-accent-primary/10 text-fg-primary",
              !submitted && !isSel && "border-border bg-bg-overlay text-fg-secondary hover:text-fg-primary",
              submitted && isCorrect && "border-success/60 bg-success/10 text-fg-primary",
              submitted && !isCorrect && isSel && "border-danger/60 bg-danger/10 text-fg-primary",
              submitted && !isCorrect && !isSel && "border-border/50 opacity-60"
            )}
          >
            <span className={cn("grid size-5 shrink-0 place-items-center rounded border", isSel ? "border-accent-primary bg-accent-primary text-white" : "border-fg-muted/40")}>
              {isSel && "✓"}
            </span>
            <span className="leading-snug">{option}</span>
            {submitted && isCorrect && <CheckCircle2 className="ml-auto size-4 text-success" />}
            {submitted && !isCorrect && isSel && <XCircle className="ml-auto size-4 text-danger" />}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `quiz-section.tsx`** — add the import and the case:

In imports add: `import { MultipleInput } from "@/components/quiz-inputs/multiple";`
In `renderInput`'s switch add before `default`: `case "multiple": return <MultipleInput {...props} />;`

- [ ] **Step 3: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /d/nied && git add app/src/components/quiz-inputs/multiple.tsx app/src/components/quiz-section.tsx && git commit -m "feat(quiz): multiple-choice input"
```

---

## Task C3: Short-answer (text) input

**Files:**
- Create: `D:\nied\app\src\components\quiz-inputs\short.tsx`
- Modify: `D:\nied\app\src\components\quiz-section.tsx`

- [ ] **Step 1: Create `src/components/quiz-inputs/short.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { QuizInputProps } from "./types";

export function ShortInput({ question, value, onChange, submitted, correct, labels }: QuizInputProps) {
  if (question.type !== "short") return null;
  const v = typeof value === "string" ? value : "";
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={v}
        disabled={submitted}
        placeholder={labels.shortPlaceholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border bg-bg-overlay px-3 py-2 text-sm text-fg-primary outline-none",
          !submitted && "border-border focus:border-accent-primary",
          submitted && correct && "border-success/60",
          submitted && correct === false && "border-danger/60"
        )}
      />
      {submitted && (
        <p className="text-xs text-fg-muted">
          {labels.correctIs}: <span className="text-fg-primary">{question.accepted[0]}</span>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `quiz-section.tsx`**

Import: `import { ShortInput } from "@/components/quiz-inputs/short";`
Case: `case "short": return <ShortInput {...props} />;`

- [ ] **Step 3: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /d/nied && git add app/src/components/quiz-inputs/short.tsx app/src/components/quiz-section.tsx && git commit -m "feat(quiz): short-answer input"
```

---

## Task C4: Matching (dropdowns, shuffled rights) input

**Files:**
- Create: `D:\nied\app\src\components\quiz-inputs\matching.tsx`
- Modify: `D:\nied\app\src\components\quiz-section.tsx`

Response shape: `number[]` of length `pairs.length`, where `response[i]` is the **original** right index chosen for left `i`. Correct when `response[i] === i`. Rights are displayed in a seeded-shuffled order but each option carries its original index.

- [ ] **Step 1: Create `src/components/quiz-inputs/matching.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import { seededShuffle } from "@/lib/quiz/seeded-shuffle";
import type { QuizInputProps } from "./types";

export function MatchingInput({ question, value, onChange, submitted, seed, labels }: QuizInputProps) {
  if (question.type !== "matching") return null;
  const pairs = question.pairs;
  // shuffled display order of right options (original indices), stable per seed
  const rightOrder = seededShuffle(pairs.length, seed + 1);
  const chosen = Array.isArray(value) ? (value as number[]) : new Array(pairs.length).fill(-1);

  const setAt = (leftIdx: number, rightOriginalIdx: number) => {
    if (submitted) return;
    const next = chosen.slice();
    while (next.length < pairs.length) next.push(-1);
    next[leftIdx] = rightOriginalIdx;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {pairs.map((pair, i) => {
        const ok = submitted && chosen[i] === i;
        const bad = submitted && chosen[i] !== i;
        return (
          <div key={i} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", ok && "border-success/60 bg-success/10", bad && "border-danger/60 bg-danger/10", !submitted && "border-border")}>
            <span className="flex-1 text-sm text-fg-primary">{pair.left}</span>
            <span className="text-fg-muted">→</span>
            <select
              value={chosen[i] >= 0 ? chosen[i] : ""}
              disabled={submitted}
              onChange={(e) => setAt(i, Number(e.target.value))}
              className="rounded-md border border-border bg-bg-overlay px-2 py-1 text-sm text-fg-primary"
            >
              <option value="" disabled>{labels.selectMatch}</option>
              {rightOrder.map((origIdx) => (
                <option key={origIdx} value={origIdx}>{pairs[origIdx].right}</option>
              ))}
            </select>
            {submitted && bad && <span className="text-xs text-fg-muted">{labels.correctIs}: {pair.right}</span>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `quiz-section.tsx`**

Import: `import { MatchingInput } from "@/components/quiz-inputs/matching";`
Case: `case "matching": return <MatchingInput {...props} />;`

- [ ] **Step 3: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd /d/nied && git add app/src/components/quiz-inputs/matching.tsx app/src/components/quiz-section.tsx && git commit -m "feat(quiz): matching input (shuffled rights, seeded)"
```

---

## Task C5: Ordering (drag-and-drop + keyboard) input

**Files:**
- Create: `D:\nied\app\src\components\quiz-inputs\ordering.tsx`
- Modify: `D:\nied\app\src\components\quiz-section.tsx`

Response shape: `number[]` = the learner's current sequence of **original** item indices. Correct when it equals `[0,1,…,n-1]`. Items start in a seeded-shuffled order. Reorder via native HTML5 drag-and-drop, plus up/down buttons for keyboard/mobile accessibility.

- [ ] **Step 1: Create `src/components/quiz-inputs/ordering.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { seededShuffle } from "@/lib/quiz/seeded-shuffle";
import { ChevronUp, ChevronDown } from "@/components/icons";
import type { QuizInputProps } from "./types";

export function OrderingInput({ question, value, onChange, submitted, seed, labels }: QuizInputProps) {
  // Initialize order from value (if any) or a seeded shuffle. Item content is
  // looked up by original index; `order` holds original indices.
  const isOrdering = question.type === "ordering";
  const n = isOrdering ? question.items.length : 0;
  const [order, setOrder] = useState<number[]>(() =>
    Array.isArray(value) ? (value as number[]) : []
  );
  const dragIdx = useRef<number | null>(null);

  // Seed the initial shuffled order once on mount if no draft exists yet.
  useEffect(() => {
    if (order.length === 0 && n > 0) {
      const init = seededShuffle(n, seed + 7);
      setOrder(init);
      onChange(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOrdering) return null;

  const apply = (next: number[]) => {
    setOrder(next);
    onChange(next);
  };
  const move = (from: number, to: number) => {
    if (submitted || to < 0 || to >= order.length || from === to) return;
    const next = order.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    apply(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">{labels.orderingHint}</p>
      {order.map((origIdx, pos) => {
        const ok = submitted && origIdx === pos;
        const bad = submitted && origIdx !== pos;
        return (
          <div
            key={origIdx}
            draggable={!submitted}
            onDragStart={() => (dragIdx.current = pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx.current !== null) move(dragIdx.current, pos); dragIdx.current = null; }}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              !submitted && "cursor-grab border-border bg-bg-overlay active:cursor-grabbing",
              ok && "border-success/60 bg-success/10",
              bad && "border-danger/60 bg-danger/10"
            )}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bg-elevated font-mono text-[11px] text-fg-muted">{pos + 1}</span>
            <span className="flex-1 text-fg-primary">{question.items[origIdx]}</span>
            {!submitted && (
              <span className="flex gap-1">
                <button type="button" aria-label={labels.moveUp} onClick={() => move(pos, pos - 1)} className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg-primary disabled:opacity-30" disabled={pos === 0}>
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" aria-label={labels.moveDown} onClick={() => move(pos, pos + 1)} className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg-primary disabled:opacity-30" disabled={pos === order.length - 1}>
                  <ChevronDown className="size-4" />
                </button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Ensure `ChevronUp`/`ChevronDown` are exported** from `src/components/icons.tsx`.

Run: `cd /d/nied/app && grep -n "ChevronUp\|ChevronDown" src/components/icons.tsx`
If missing, add them following the existing `lucide-react` re-export pattern, then re-run.

- [ ] **Step 3: Wire into `quiz-section.tsx`**

Import: `import { OrderingInput } from "@/components/quiz-inputs/ordering";`
Case: `case "ordering": return <OrderingInput {...props} />;`

- [ ] **Step 4: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add app/src/components/quiz-inputs/ordering.tsx app/src/components/quiz-section.tsx app/src/components/icons.tsx && git commit -m "feat(quiz): ordering input (drag-and-drop + keyboard)"
```

---

# PHASE D — Plugin + demo + smoke

## Task D1: Update the plugin quiz contract (methodology)

**Files:**
- Modify: `D:\nied\plugin\skills\methodology\SKILL.md`

- [ ] **Step 1: Replace the "## Quiz anatomy (`quizzes/uN.json`, schema v1)" section** (the block documenting the v1 quiz contract). Update its heading to `## Quiz anatomy (\`quizzes/uN.json\`, schema v2)` and replace the rules with documentation of all six types. Use this content:

````markdown
## Quiz anatomy (`quizzes/uN.json`, schema v2)

- 8–15 questions covering every major section (`section` field set).
- Every question has `question`, `explanation`, optional `section`, and a `type`.
  If `type` is omitted it defaults to `single` (v1 compatibility).
- All types are **deterministic and auto-gradable** (no LLM judge). Choose the
  type that fits the cognitive task; do not force everything into multiple choice.

Types and their fields:
- `single` — `options` (≥2, unique) + `correct_index` (0-based, `< options.length`).
- `multiple` — `options` (≥2, unique) + `correct_indices` (≥1, unique, in range). All-or-nothing.
- `numeric` — `answer` (number) + `tolerance` (≥0) + optional `unit`. Use a non-zero
  tolerance for any value with decimals or rounding.
- `short` — `accepted` (≥1 strings). Grading is case/accent/space-insensitive; list
  every acceptable surface form. Only use when the answer is a single unambiguous term.
- `matching` — `pairs` (≥2 `{left, right}`). The app shuffles the rights.
- `ordering` — `items` (≥2) written **in the correct order**. The app shuffles them.

Rules: `unit_id` must equal the unit id in the filename; `xp_per_question` is a
positive integer; all user-facing text is in the course language; schema keys and
identifiers stay in English. Prefer a mix of types across the quiz.
````

- [ ] **Step 2: Verify the plugin still validates** (the schema validator is the source of truth; this is docs).

Run: `cd /d/nied/schema && bun test`
Expected: PASS (unchanged — sanity check that nothing referenced broke).

- [ ] **Step 3: Commit**

```bash
cd /d/nied && git add plugin/skills/methodology/SKILL.md && git commit -m "docs(plugin): document schema v2 quiz types in methodology"
```

---

## Task D2: Writer can emit, auditor verifies the new types

**Files:**
- Modify: `D:\nied\plugin\agents\course-writer.md`
- Modify: `D:\nied\plugin\agents\course-auditor.md`

- [ ] **Step 1: Add a quiz-types guidance block to `course-writer.md`.** Find the section where it describes generating the quiz; append this paragraph there (match the doc's tone):

```markdown
When writing `quizzes/uN.json`, use schema v2 question types deliberately:
reach for `numeric` (with a sensible `tolerance`) for any calculation, `multiple`
for "select all that apply", `matching`/`ordering` for relationships and
sequences, and `short` only for a single unambiguous term (list every accepted
surface form in `accepted`). Default to `single` otherwise. Every question must
be deterministically gradable; never write a question whose correct answer is
subjective.
```

- [ ] **Step 2: Add per-type verification to `course-auditor.md`.** Find the quiz-audit checklist; append these checks:

```markdown
For each quiz question, verify by type that it is well-formed AND that the declared
answer is actually correct:
- `multiple`: `correct_indices` non-empty, unique, in range; the marked options are
  genuinely the correct set and the unmarked ones are genuinely wrong.
- `numeric`: `tolerance >= 0`; recompute the value and confirm `answer` is right and
  the tolerance is neither absurdly wide nor too tight for the stated precision.
- `short`: `accepted` non-empty; it covers the obvious correct surface forms and a
  reasonable learner answer would match after case/accent/space normalization.
- `matching`: ≥2 pairs; each `left↔right` is the genuinely correct association.
- `ordering`: ≥2 items; the authored order is the genuinely correct sequence.
Flag any question whose correct answer is subjective or not auto-decidable.
```

- [ ] **Step 3: Commit**

```bash
cd /d/nied && git add plugin/agents/course-writer.md plugin/agents/course-auditor.md && git commit -m "docs(plugin): writer emits + auditor verifies v2 quiz types"
```

---

## Task D3: Demo quiz + Playwright smoke

**Files:**
- Create/modify: `D:\nied\courses\estadistica-aplicada\quizzes\u2.json` (add v2-type questions for smoke; keep it a valid quiz)
- No code; verification via Playwright MCP.

- [ ] **Step 1: Add a v2 quiz** at `D:\nied\courses\estadistica-aplicada\quizzes\u2.json` (u2 already has prose). Write a valid quiz exercising the new types:

```json
{
  "unit_id": "u2",
  "title": "Quiz: Estadística descriptiva",
  "instructions": "Responde cada pregunta. Hay distintos formatos.",
  "xp_per_question": 10,
  "questions": [
    {
      "type": "numeric",
      "question": "La media de 2, 4 y 9 es:",
      "explanation": "(2+4+9)/3 = 5.",
      "answer": 5,
      "tolerance": 0.01,
      "section": "Medidas de tendencia central"
    },
    {
      "type": "multiple",
      "question": "¿Cuáles son medidas de dispersión? Marca todas las que apliquen.",
      "explanation": "La varianza y el rango miden dispersión; la mediana es de posición.",
      "options": ["Varianza", "Mediana", "Rango"],
      "correct_indices": [0, 2],
      "section": "Dispersión"
    },
    {
      "type": "short",
      "question": "¿Qué medida de tendencia central es el valor más frecuente?",
      "explanation": "La moda es el valor que más se repite.",
      "accepted": ["moda", "la moda"],
      "section": "Medidas de tendencia central"
    },
    {
      "type": "ordering",
      "question": "Ordena estos pasos de menor a mayor robustez ante outliers.",
      "explanation": "La media es la menos robusta; la mediana, la más.",
      "items": ["Media", "Media recortada", "Mediana"],
      "section": "Robustez"
    }
  ]
}
```

- [ ] **Step 2: Validate the demo quiz with the schema CLI**

Run: `cd /d/nied/schema && bun run src/cli.ts validate ../courses/estadistica-aplicada --allow-missing-units` (or the project's documented validate command). 
Expected: the quiz passes validation. If the command differs, find it in `schema/package.json` scripts and use that.

- [ ] **Step 3: Run the full app + schema test suites**

Run: `cd /d/nied/schema && bun test` then `cd /d/nied/app && bun test src/lib/__test__`
Expected: all pass.

- [ ] **Step 4: Playwright smoke (manual via MCP).** Start the dev server (`cd /d/nied/app && bun run dev`), then:
- Navigate to `http://localhost:3000/courses/estadistica-aplicada/u2`.
- Numeric: type `5` → Submit → marked correct, +XP toast.
- Multiple: select "Varianza" + "Rango" → Submit → correct.
- Short: type `Moda` (capitalized, to prove normalization) → Submit → correct.
- Ordering: drag/reorder to Media, Media recortada, Mediana → Submit → correct.
- Reload the page → the four show as answered/correct (revealed), no double XP.

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add -f courses/estadistica-aplicada/quizzes/u2.json && git commit -m "test(quiz): v2 demo quiz on estadistica u2 + e2e smoke"
```
(Note: `courses/*` is gitignored except the demo; `-f` forces the demo quiz in if needed, matching how the demo ships.)

---

## Self-Review (completed during planning)

**Spec coverage:**
- §2 six types as discriminated union + backward-compat default `single` → Task A1 ✓
- §3 `gradeQuestion` + `normalizeText` + response semantics (matching/ordering identity) → Task A2 ✓
- §2 `schema_version` 1|2 → Task A3 ✓
- §4 DB `response` TEXT (no migration, disposable) → Task B1 ✓
- §4 action grades via gradeQuestion, XP/streak/SRS unchanged, stores JSON → Task B2 ✓
- §4 per-type UI (single, numeric, multiple, short, matching, ordering); reveal correct, no re-hydration → Tasks B3, C2–C5 ✓
- §4 seeded shuffle anti-hydration for matching/ordering → Task C1 (used in C4/C5) ✓
- §5 plugin methodology/writer/auditor → Tasks D1, D2 ✓
- §9 testing (schema, grade, shuffle, i18n parity, Playwright smoke) → A1–A3, C1, B3, D3 ✓

**Placeholder scan:** no TBD/TODO; every code step has complete code.

**Type consistency:** `QuizQuestion`, `QuizResponse`, `gradeQuestion`, `normalizeText`, `QuizInputProps`/`QuizInputLabels`, `seededShuffle(n, seed)`, DB `response` column, action `submitQuizAnswer(..., response)` are consistent across tasks. Matching/ordering response = array of original indices, correct when `response[i] === i` — consistent between grader (A2) and inputs (C4/C5).

**Note on restoration:** per the approved decision, answered questions restore as "submitted + correct/incorrect" and reveal the correct answer; the exact prior response is not re-hydrated (`response: null` in `buildInitial`). Inputs render read-only with the correct answer shown.
