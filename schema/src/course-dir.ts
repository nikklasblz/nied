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
      errors: [{ file: "course.yaml", severity: "error", message: `could not read or parse course.yaml: ${e}` }],
      warnings: [],
      course: null,
    };
  }

  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      errors: parsed.error.issues.map((i) => {
        const prefix = i.path.length ? i.path.join(".") + ": " : "";
        return { file: "course.yaml", severity: "error" as const, message: `${prefix}${i.message}` };
      }),
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
    const unitRelPath = `units/${unit.id}.md`;
    let unitContent: string;
    try {
      unitContent = readFileSync(unitPath, "utf-8");
    } catch (e) {
      issues.push({ file: unitRelPath, severity: "error", message: `could not read ${unitRelPath}: ${e}` });
      continue;
    }
    issues.push(...validateUnitMarkdown(unitContent, { id: unit.id, title: unit.title }, unitRelPath));

    const quizPath = join(dir, "quizzes", `${unit.id}.json`);
    const quizRelPath = `quizzes/${unit.id}.json`;
    if (existsSync(quizPath)) {
      try {
        issues.push(...validateQuizJson(readFileSync(quizPath, "utf-8"), unit.id, quizRelPath));
      } catch (e) {
        issues.push({ file: quizRelPath, severity: "error", message: `could not read ${quizRelPath}: ${e}` });
      }
    } else {
      issues.push({
        file: quizRelPath, severity: "warning",
        message: `no quiz for ${unit.id} (recommended for every unit)`,
      });
    }
  }

  return { ...split(issues), course };
}
