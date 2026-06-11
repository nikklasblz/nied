/**
 * Reglas de XP por actividad.
 *
 * El XP base de "completar unidad" se deriva de las horas declaradas en
 * course.yaml: `round(hours * xpPerHour)` (config de instancia). Las demás
 * actividades tienen XP fijo según el diseño §10.
 */

import type { UnitMeta } from "@nied/schema";
import { getConfig } from "../config";

export type Activity =
  | "unit-complete"
  | "quiz-pass"
  | "quiz-correct"
  | "exercise-submit"
  | "bitacora-entry"
  | "milestone-project"
  | "real-project-anchor";

/** XP base por completar una unidad: horas declaradas × xpPerHour de la instancia. */
export function unitXp(unit: UnitMeta): number {
  return Math.round(unit.hours * getConfig().xpPerHour);
}

export const XP_RULES: {
  unitComplete: (unit: UnitMeta) => number;
  quizPass: number;
  exerciseSubmit: number;
  bitacoraEntry: number;
  milestoneProject: number;
  realProjectAnchor: number;
} = {
  unitComplete: unitXp,
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
