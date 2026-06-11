import { describe, expect, test } from "bun:test";
import { checkCourseGraph } from "../src/graph";
import type { CourseMeta } from "../src/types";

function course(units: CourseMeta["units"]): CourseMeta {
  return {
    schema_version: 1,
    slug: "test",
    title: "T",
    language: "es",
    level: "intro",
    description: "d",
    units,
  };
}

const u = (id: string, depends_on: string[] = []) => ({
  id, title: id, objectives: ["o"], hours: 1, depends_on,
});

describe("checkCourseGraph", () => {
  test("valid graph has no errors", () => {
    expect(checkCourseGraph(course([u("u1"), u("u2", ["u1"])]))).toEqual([]);
  });

  test("duplicate unit ids -> error", () => {
    const issues = checkCourseGraph(course([u("u1"), u("u1")]));
    expect(issues.some((i) => i.message.includes("duplicate"))).toBe(true);
  });

  test("depends_on referencing missing unit -> error", () => {
    const issues = checkCourseGraph(course([u("u1", ["u9"])]));
    expect(issues.some((i) => i.message.includes("u9"))).toBe(true);
  });

  test("self-dependency -> error", () => {
    const issues = checkCourseGraph(course([u("u1", ["u1"])]));
    expect(issues.length).toBeGreaterThan(0);
  });

  test("dependency cycle -> error", () => {
    const issues = checkCourseGraph(
      course([u("u1", ["u2"]), u("u2", ["u1"])])
    );
    expect(issues.some((i) => i.message.includes("cycle"))).toBe(true);
  });
});
