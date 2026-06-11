import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateCourseDir } from "../src/course-dir";

const FIXTURE = join(import.meta.dir, "fixtures", "valid-course");

describe("validateCourseDir", () => {
  test("valid fixture course -> no errors (warnings allowed)", () => {
    const result = validateCourseDir(FIXTURE);
    expect(result.errors).toEqual([]);
    // u1 video src vacío -> warning; u2 sin quiz -> warning
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.course?.slug).toBe("valid-course");
  });

  test("missing course.yaml -> single fatal error", () => {
    const result = validateCourseDir(join(import.meta.dir, "fixtures"));
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]!.message).toContain("course.yaml");
    expect(result.course).toBeNull();
  });

  test("declared unit without units/uN.md file -> error", () => {
    const dir = mkdtempSync(join(tmpdir(), "nied-test-"));
    mkdirSync(join(dir, "units"), { recursive: true });
    writeFileSync(
      join(dir, "course.yaml"),
      `schema_version: 1\nslug: t\ntitle: T\nlanguage: es\nlevel: intro\ndescription: d\nunits:\n  - id: u1\n    title: X\n    objectives: [o]\n    hours: 1\n`
    );
    const result = validateCourseDir(dir);
    expect(
      result.errors.some((i) => i.message.includes("units/u1.md"))
    ).toBe(true);
  });

  test("invalid course.yaml shape -> zod errors with paths, course null", () => {
    const dir = mkdtempSync(join(tmpdir(), "nied-test-"));
    writeFileSync(join(dir, "course.yaml"), `schema_version: 1\nslug: BAD SLUG\n`);
    const result = validateCourseDir(dir);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.course).toBeNull();
  });
});
