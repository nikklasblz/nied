import { z } from "zod";

// BCP-47 subset: 2-3 letter lang + optional 4-char script + optional region (2 alpha or 3 digit)
export const LANGUAGE_RE = /^[a-z]{2,3}(-[A-Za-z]{4})?(-([A-Z]{2}|\d{3}))?$/;
export const UNIT_ID_RE = /^u[1-9]\d*$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// v1 is strict: unknown keys are authoring errors. Relax in v2 if optional fields are added.
export const unitMetaSchema = z.strictObject({
  id: z.string().regex(UNIT_ID_RE, "unit id must match u<positive-integer>, e.g. u1 or u10 (no u0, no leading zeros)"),
  title: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  hours: z.number().positive().describe("contact hours; fractions allowed, e.g. 1.5"),
  depends_on: z.array(z.string().regex(UNIT_ID_RE)).default([]),
});

// v1 is strict: unknown keys are authoring errors. Relax in v2 if optional fields are added.
export const courseSchema = z.strictObject({
  schema_version: z.literal(1),
  slug: z.string().regex(SLUG_RE, "slug must be kebab-case"),
  title: z.string().min(1),
  language: z
    .string()
    .regex(LANGUAGE_RE, "language must be BCP-47, e.g. 'es', 'en-US', 'es-419'"),
  level: z.enum(["intro", "intermediate", "advanced"]),
  description: z.string().min(1),
  units: z.array(unitMetaSchema).min(1),
});

export type UnitMeta = z.infer<typeof unitMetaSchema>;
export type CourseMeta = z.infer<typeof courseSchema>;

/** Un problema de validación. severity "error" bloquea; "warning" no. */
export interface Issue {
  file: string;
  message: string;
  severity: "error" | "warning";
}
