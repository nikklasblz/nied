import { describe, expect, test } from "bun:test";
import { courseSchema } from "../src/types";

const validCourse = {
  schema_version: 1,
  slug: "intro-statistics",
  title: "Introducción a la estadística",
  language: "es",
  level: "intro",
  description: "Curso de estadística para análisis de datos.",
  units: [
    {
      id: "u1",
      title: "Datos y variables",
      objectives: ["Distinguir tipos de variables"],
      hours: 8,
      depends_on: [],
    },
    {
      id: "u2",
      title: "Distribuciones",
      objectives: ["Interpretar histogramas"],
      hours: 10,
      depends_on: ["u1"],
    },
  ],
};

describe("courseSchema", () => {
  test("accepts a valid course", () => {
    expect(courseSchema.safeParse(validCourse).success).toBe(true);
  });

  test("rejects wrong schema_version", () => {
    expect(
      courseSchema.safeParse({ ...validCourse, schema_version: 2 }).success
    ).toBe(false);
  });

  test("rejects bad slug (uppercase/spaces)", () => {
    expect(
      courseSchema.safeParse({ ...validCourse, slug: "Intro Stats" }).success
    ).toBe(false);
  });

  test("rejects unknown level", () => {
    expect(
      courseSchema.safeParse({ ...validCourse, level: "phd" }).success
    ).toBe(false);
  });

  test("rejects unit id not matching u<number>", () => {
    const bad = structuredClone(validCourse);
    bad.units[0]!.id = "unit-1";
    expect(courseSchema.safeParse(bad).success).toBe(false);
  });

  test("rejects empty units", () => {
    expect(
      courseSchema.safeParse({ ...validCourse, units: [] }).success
    ).toBe(false);
  });

  test("depends_on defaults to empty array", () => {
    const course = structuredClone(validCourse);
    // @ts-expect-error - probando el default
    delete course.units[0].depends_on;
    const parsed = courseSchema.parse(course);
    expect(parsed.units[0]!.depends_on).toEqual([]);
  });
});
