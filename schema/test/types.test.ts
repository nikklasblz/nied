import { describe, expect, test } from "bun:test";
import { courseSchema, unitMetaSchema } from "../src/types";

const validUnit = {
  id: "u1",
  title: "Datos y variables",
  objectives: ["Distinguir tipos de variables"],
  hours: 8,
  depends_on: [],
};

const validCourse = {
  schema_version: 1,
  slug: "intro-statistics",
  title: "Introducción a la estadística",
  language: "es",
  level: "intro",
  description: "Curso de estadística para análisis de datos.",
  units: [
    validUnit,
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

  // --- language ---
  test("language: accepts 'es'", () => {
    expect(courseSchema.safeParse({ ...validCourse, language: "es" }).success).toBe(true);
  });

  test("language: accepts 'en-US'", () => {
    expect(courseSchema.safeParse({ ...validCourse, language: "en-US" }).success).toBe(true);
  });

  test("language: accepts 'pt-BR'", () => {
    expect(courseSchema.safeParse({ ...validCourse, language: "pt-BR" }).success).toBe(true);
  });

  test("language: accepts 'es-419'", () => {
    expect(courseSchema.safeParse({ ...validCourse, language: "es-419" }).success).toBe(true);
  });

  test("language: rejects 'EN' (uppercase)", () => {
    expect(courseSchema.safeParse({ ...validCourse, language: "EN" }).success).toBe(false);
  });

  test("language: rejects 'en-us' (lowercase region)", () => {
    expect(courseSchema.safeParse({ ...validCourse, language: "en-us" }).success).toBe(false);
  });

  test("language: rejects 'spanish' (full word)", () => {
    expect(courseSchema.safeParse({ ...validCourse, language: "spanish" }).success).toBe(false);
  });

  // --- unknown keys (strict objects) ---
  test("rejects course with unknown key 'dependson' (typo)", () => {
    expect(
      courseSchema.safeParse({ ...validCourse, dependson: [] }).success
    ).toBe(false);
  });

  test("rejects unit with unknown key", () => {
    const bad = structuredClone(validCourse);
    // @ts-expect-error - testing unknown key rejection
    bad.units[0].extraField = "oops";
    expect(courseSchema.safeParse(bad).success).toBe(false);
  });

  // --- unit id ---
  test("unit id: rejects 'u0'", () => {
    const bad = structuredClone(validCourse);
    bad.units[0]!.id = "u0";
    expect(courseSchema.safeParse(bad).success).toBe(false);
  });

  test("unit id: rejects 'u01' (leading zero)", () => {
    const bad = structuredClone(validCourse);
    bad.units[0]!.id = "u01";
    expect(courseSchema.safeParse(bad).success).toBe(false);
  });

  test("unit id: accepts 'u10'", () => {
    const bad = structuredClone(validCourse);
    bad.units[0]!.id = "u10";
    // fix depends_on in u2 to avoid cross-ref issues (schema doesn't validate cross-refs yet)
    expect(courseSchema.safeParse(bad).success).toBe(true);
  });
});

describe("unitMetaSchema", () => {
  test("rejects empty objectives", () => {
    expect(
      unitMetaSchema.safeParse({ ...validUnit, objectives: [] }).success
    ).toBe(false);
  });

  test("rejects hours = 0", () => {
    expect(
      unitMetaSchema.safeParse({ ...validUnit, hours: 0 }).success
    ).toBe(false);
  });

  test("accepts hours = 1.5 (fractional)", () => {
    expect(
      unitMetaSchema.safeParse({ ...validUnit, hours: 1.5 }).success
    ).toBe(true);
  });

  test("rejects depends_on with bad unit id", () => {
    expect(
      unitMetaSchema.safeParse({ ...validUnit, depends_on: ["unit-1"] }).success
    ).toBe(false);
  });
});
