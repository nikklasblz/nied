import { describe, expect, test, beforeAll } from "bun:test";
import { join } from "node:path";
import { listCourses, getCourse, getUnitView } from "../content/courses";

beforeAll(() => {
  process.env.NIED_COURSES_ROOT = join(import.meta.dir, "..", "..", "..", "..", "schema", "test", "fixtures");
});

describe("courses loader", () => {
  test("listCourses discovers fixture course by folder name", () => {
    const all = listCourses();
    const c = all.find((x) => x.id === "valid-course");
    expect(c).toBeDefined();
    expect(c!.meta.slug).toBe("valid-course");
    expect(c!.totalHours).toBe(10);
    expect(c!.writtenUnits).toEqual(["u1", "u2"]);
  });

  test("getCourse returns null for unknown id", () => {
    expect(getCourse("nope")).toBeNull();
  });

  test("getCourse rejects path traversal", () => {
    expect(getCourse("../evil")).toBeNull();
  });

  test("getUnitView renders sections", async () => {
    const v = await getUnitView("valid-course", "u1");
    expect(v).not.toBeNull();
    expect(v!.unit.title).toBe("Unidad uno");
    expect(v!.sections.length).toBeGreaterThan(0);
    expect(v!.sections[0]!.html).toContain("<");
    // preamble must never contain a duplicate h1 (the page renders the title separately)
    expect(v!.preambleHtml).not.toContain("<h1");
  });

  test("getUnitView null for unwritten unit", async () => {
    expect(await getUnitView("valid-course", "u99")).toBeNull();
  });
});
