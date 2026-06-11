import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { courseSchema, type CourseMeta, type Issue } from "./types";
import { checkCourseGraph } from "./graph";
import { validateUnitMarkdown } from "./unit";
import { validateQuizJson } from "./quiz";

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
  course: CourseMeta | null;
}

function split(issues: Issue[]): { errors: Issue[]; warnings: Issue[] } {
  return {
    errors: issues.filter((i) => i.severity === "error"),
    warnings: issues.filter((i) => i.severity === "warning"),
  };
}

/** Valida una carpeta de curso completa contra el schema v1. */
export function validateCourseDir(dir: string): ValidationResult {
  const issues: Issue[] = [];
  const courseFile = join(dir, "course.yaml");

  if (!existsSync(courseFile)) {
    return {
      errors: [{ file: "course.yaml", severity: "error", message: "course.yaml not found" }],
      warnings: [],
      course: null,
    };
  }

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(courseFile, "utf-8"));
  } catch (e) {
    return {
      errors: [{ file: "course.yaml", severity: "error", message: `YAML parse failed: ${e}` }],
      warnings: [],
      course: null,
    };
  }

  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((i) => ({
        file: "course.yaml",
        severity: "error" as const,
        message: `${i.path.join(".")}: ${i.message}`,
      })),
      warnings: [],
      course: null,
    };
  }

  const course = parsed.data;
  issues.push(...checkCourseGraph(course));

  for (const unit of course.units) {
    const unitPath = join(dir, "units", `${unit.id}.md`);
    if (!existsSync(unitPath)) {
      issues.push({
        file: `units/${unit.id}.md`, severity: "error",
        message: `declared in course.yaml but units/${unit.id}.md not found`,
      });
      continue;
    }
    issues.push(
      ...validateUnitMarkdown(
        readFileSync(unitPath, "utf-8"),
        { id: unit.id, title: unit.title },
        `units/${unit.id}.md`
      )
    );

    const quizPath = join(dir, "quizzes", `${unit.id}.json`);
    if (existsSync(quizPath)) {
      issues.push(
        ...validateQuizJson(readFileSync(quizPath, "utf-8"), unit.id, `quizzes/${unit.id}.json`)
      );
    } else {
      issues.push({
        file: `quizzes/${unit.id}.json`, severity: "warning",
        message: `no quiz for ${unit.id} (recommended for every unit)`,
      });
    }
  }

  return { ...split(issues), course };
}
