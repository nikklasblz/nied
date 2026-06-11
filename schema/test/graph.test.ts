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
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  test("depends_on referencing missing unit -> error", () => {
    const issues = checkCourseGraph(course([u("u1", ["u9"])]));
    expect(issues.some((i) => i.message.includes("u9"))).toBe(true);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  // Strengthened: exactly 1 issue, "depends on itself", severity "error", no "cycle" message
  test("self-dependency -> exactly one issue, no cycle error", () => {
    const issues = checkCourseGraph(course([u("u1", ["u1"])]));
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain("depends on itself");
    expect(issues[0]!.severity).toBe("error");
    expect(issues.every((i) => !i.message.includes("cycle"))).toBe(true);
  });

  test("dependency cycle -> error with severity", () => {
    const issues = checkCourseGraph(
      course([u("u1", ["u2"]), u("u2", ["u1"])])
    );
    expect(issues.some((i) => i.message.includes("cycle"))).toBe(true);
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  // NEW: back-edge must identify the actual cycle node, not the DFS entry point.
  // Graph: u1→u2→u3→u2 (u1 is NOT part of the cycle; u2/u3 are).
  // The reported node must be u2 or u3, never u1.
  test("cycle misattribution: reports actual cycle node not DFS entry", () => {
    const issues = checkCourseGraph(
      course([u("u1", ["u2"]), u("u2", ["u3"]), u("u3", ["u2"])])
    );
    const cycleIssues = issues.filter((i) => i.message.includes("cycle"));
    expect(cycleIssues.length).toBeGreaterThan(0);
    expect(cycleIssues.every((i) => !i.message.includes("u1"))).toBe(true);
    expect(cycleIssues.every((i) => i.severity === "error")).toBe(true);
  });

  // NEW: two independent 2-cycles should produce exactly 1 cycle error (fix-and-rerun UX).
  test("two independent cycles -> exactly 1 cycle error reported", () => {
    const issues = checkCourseGraph(
      course([u("u1", ["u2"]), u("u2", ["u1"]), u("u3", ["u4"]), u("u4", ["u3"])])
    );
    const cycleIssues = issues.filter((i) => i.message.includes("cycle"));
    expect(cycleIssues).toHaveLength(1);
    expect(cycleIssues[0]!.severity).toBe("error");
  });

  // NEW: diamond shape (shared ancestor, no cycle) -> zero issues.
  // u1 <- u2 <- u4
  //    <- u3 <-/
  test("diamond dependency graph -> no issues", () => {
    const issues = checkCourseGraph(
      course([u("u1"), u("u2", ["u1"]), u("u3", ["u1"]), u("u4", ["u2", "u3"])])
    );
    expect(issues).toHaveLength(0);
  });
});
