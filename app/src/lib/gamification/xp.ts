/**
 * Reglas de XP por actividad.
 *
 * El XP base de "completar unidad" sale del frontmatter del sílabo
 * (`unit.xp_reward`). Las demás actividades tienen XP fijo según el diseño §10.
 */

import type { UnitMeta } from "../content/types";

export type Activity =
  | "unit-complete"
  | "quiz-pass"
  | "exercise-submit"
  | "bitacora-entry"
  | "milestone-project"
  | "real-project-anchor";

export const XP_RULES: {
  unitComplete: (unit: UnitMeta) => number;
  quizPass: number;
  exerciseSubmit: number;
  bitacoraEntry: number;
  milestoneProject: number;
  realProjectAnchor: number;
} = {
  unitComplete: (unit) => unit.xp_reward,
  quizPass: 50,
  exerciseSubmit: 75,
  bitacoraEntry: 20,
  milestoneProject: 300,
  realProjectAnchor: 100,
} as const;

/** Aplica multiplicador de racha y redondea a entero. */
export function applyMultiplier(baseXp: number, multiplier: number): number {
  return Math.round(baseXp * multiplier);
}
