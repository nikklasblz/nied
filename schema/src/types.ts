import { z } from "zod";

export const UNIT_ID_RE = /^u\d+$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const LANGUAGE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export const unitMetaSchema = z.object({
  id: z.string().regex(UNIT_ID_RE, "unit id must match u<number>, e.g. u1"),
  title: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  hours: z.number().positive(),
  depends_on: z.array(z.string().regex(UNIT_ID_RE)).default([]),
});

export const courseSchema = z.object({
  schema_version: z.literal(1),
  slug: z.string().regex(SLUG_RE, "slug must be kebab-case"),
  title: z.string().min(1),
  language: z
    .string()
    .regex(LANGUAGE_RE, "language must be e.g. 'es' or 'en-US'"),
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
