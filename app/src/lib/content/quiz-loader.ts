import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { quizSchema, type Quiz } from "@nied/schema";
import { getConfig } from "../config";

export type { Quiz };

const COURSE_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const UNIT_ID_RE = /^u[1-9]\d*$/;

/** Carga quizzes/<unitId>.json (schema v1, claves en inglés). */
export function loadQuiz(courseId: string, unitId: string): Quiz | null {
  if (!COURSE_ID_RE.test(courseId)) return null;
  if (!UNIT_ID_RE.test(unitId)) return null;
  const p = join(getConfig().coursesRoot, courseId, "quizzes", `${unitId}.json`);
  if (!existsSync(p)) return null;
  try {
    const parsed = quizSchema.safeParse(JSON.parse(readFileSync(p, "utf-8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
