import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { validateCourseDir } from "@nied/schema";
import { getConfig } from "../config";
import { renderMarkdownToHtml } from "./parser";
import { splitMarkdownSections } from "./sections";
import type { CourseEntry, UnitView } from "./types";

const COURSE_ID_RE = /^[a-z0-9][a-z0-9-]*$/i;

function loadEntry(root: string, id: string): CourseEntry | null {
  const dir = join(root, id);
  const result = validateCourseDir(dir, { allowMissingUnits: true });
  if (!result.course || result.errors.length > 0) return null;
  const writtenUnits = result.course.units
    .map((u) => u.id)
    .filter((uid) => existsSync(join(dir, "units", `${uid}.md`)));
  return {
    id,
    meta: result.course,
    totalHours: result.course.units.reduce((s, u) => s + u.hours, 0),
    writtenUnits,
  };
}

export function listCourses(): CourseEntry[] {
  const root = getConfig().coursesRoot;
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => loadEntry(root, e.name))
    .filter((c): c is CourseEntry => c !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getCourse(id: string): CourseEntry | null {
  if (!COURSE_ID_RE.test(id)) return null;
  const root = getConfig().coursesRoot;
  if (!existsSync(join(root, id, "course.yaml"))) return null;
  return loadEntry(root, id);
}

export async function getUnitView(courseId: string, unitId: string): Promise<UnitView | null> {
  const course = getCourse(courseId);
  if (!course) return null;
  const unit = course.meta.units.find((u) => u.id === unitId);
  if (!unit) return null;
  const path = join(getConfig().coursesRoot, courseId, "units", `${unitId}.md`);
  if (!existsSync(path)) return null;
  const { content } = matter(readFileSync(path, "utf-8"));
  const split = splitMarkdownSections(content);
  return {
    course,
    unit,
    preambleHtml: await renderMarkdownToHtml(split.preamble),
    sections: await Promise.all(
      split.sections.map(async (s) => ({
        index: s.index,
        title: s.title,
        html: await renderMarkdownToHtml(s.markdown),
      }))
    ),
  };
}
