import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateCourseDir } from "../src/course-dir";

const FIXTURE = join(import.meta.dir, "fixtures", "valid-course");

/** Creates a temp course with u1.md written but u2.md absent. */
function makePartialCourse(): string {
  const dir = mkdtempSync(join(tmpdir(), "nied-partial-"));
  mkdirSync(join(dir, "units"), { recursive: true });
  writeFileSync(
    join(dir, "course.yaml"),
    [
      "schema_version: 1",
      "slug: partial-course",
      "title: Partial",
      "language: es",
      "level: intro",
      "description: d",
      "units:",
      "  - id: u1",
      "    title: U1",
      "    objectives: [o]",
      "    hours: 1",
      "  - id: u2",
      "    title: U2",
      "    objectives: [o]",
      "    hours: 1",
    ].join("\n")
  );
  writeFileSync(
    join(dir, "units", "u1.md"),
    "---\nid: u1\ntitle: U1\n---\n\nContent.\n"
  );
  // u2.md intentionally NOT written
  return dir;
}

describe("validateCourseDir", () => {
  test("valid fixture course -> no errors (warnings allowed)", () => {
    const result = validateCourseDir(FIXTURE);
    expect(result.errors).toEqual([]);
    // u1 video src vacío -> warning; u2 sin quiz -> warning
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.course?.slug).toBe("valid-course");
  });

  test("missing course.yaml -> single fatal error", () => {
    const dir = mkdtempSync(join(tmpdir(), "nied-test-"));
    const result = validateCourseDir(dir);
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

  test("malformed YAML content -> 1 error mentioning course.yaml, course null", () => {
    const dir = mkdtempSync(join(tmpdir(), "nied-test-"));
    writeFileSync(join(dir, "course.yaml"), "slug: {bad: [yaml");
    const result = validateCourseDir(dir);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]!.message).toContain("course.yaml");
    expect(result.course).toBeNull();
  });

  test("empty course.yaml -> errors > 0 and no message starts with ': '", () => {
    const dir = mkdtempSync(join(tmpdir(), "nied-test-"));
    writeFileSync(join(dir, "course.yaml"), "");
    const result = validateCourseDir(dir);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every((e) => !e.message.startsWith(": "))).toBe(true);
    expect(result.course).toBeNull();
  });

  test("cycle in depends_on -> error containing 'cycle'", () => {
    const dir = mkdtempSync(join(tmpdir(), "nied-test-"));
    mkdirSync(join(dir, "units"), { recursive: true });
    writeFileSync(
      join(dir, "course.yaml"),
      [
        "schema_version: 1",
        "slug: cycle-course",
        "title: T",
        "language: es",
        "level: intro",
        "description: d",
        "units:",
        "  - id: u1",
        "    title: U1",
        "    objectives: [o]",
        "    hours: 1",
        "    depends_on: [u2]",
        "  - id: u2",
        "    title: U2",
        "    objectives: [o]",
        "    hours: 1",
        "    depends_on: [u1]",
      ].join("\n")
    );
    writeFileSync(join(dir, "units", "u1.md"), "---\nid: u1\ntitle: U1\n---\n\nContent.\n");
    writeFileSync(join(dir, "units", "u2.md"), "---\nid: u2\ntitle: U2\n---\n\nContent.\n");
    const result = validateCourseDir(dir);
    expect(result.errors.some((e) => e.message.includes("cycle"))).toBe(true);
  });
});

describe("validateCourseDir — incremental (allowMissingUnits)", () => {
  test("partial course default mode -> error mentioning units/u2.md", () => {
    const dir = makePartialCourse();
    const result = validateCourseDir(dir);
    expect(result.errors.some((e) => e.message.includes("units/u2.md"))).toBe(true);
  });

  test("partial course allowMissingUnits -> zero errors", () => {
    const dir = makePartialCourse();
    const result = validateCourseDir(dir, { allowMissingUnits: true });
    expect(result.errors).toEqual([]);
  });

  test("partial course allowMissingUnits -> warning 'not written yet' for u2", () => {
    const dir = makePartialCourse();
    const result = validateCourseDir(dir, { allowMissingUnits: true });
    expect(
      result.warnings.some((w) => w.message.includes("not written yet") && w.message.includes("u2"))
    ).toBe(true);
  });

  test("partial course allowMissingUnits -> NO quiz-missing warning for u2", () => {
    const dir = makePartialCourse();
    const result = validateCourseDir(dir, { allowMissingUnits: true });
    expect(
      result.warnings.some((w) => w.message.includes("quiz") && w.message.includes("u2"))
    ).toBe(false);
  });

  test("complete fixture with allowMissingUnits -> identical result as without flag", () => {
    const without = validateCourseDir(FIXTURE);
    const withFlag = validateCourseDir(FIXTURE, { allowMissingUnits: true });
    expect(withFlag.errors).toEqual(without.errors);
    expect(withFlag.warnings).toEqual(without.warnings);
    expect(withFlag.course?.slug).toBe(without.course?.slug);
  });
});
