/**
 * Niveles globales (10) y por track (5) para niED.
 *
 * Los thresholds son XP acumulados — el usuario nunca pierde XP, así que el
 * nivel solo crece. Nombres alineados con el diseño §10 (Aprendiz → Maestría
 * plena), resueltos vía i18n (claves level.1..level.10).
 */

import { t } from "../i18n";

export type GlobalLevel = {
  level: number;
  name: string;
  xpRequired: number;
  /** XP necesarios para alcanzar el siguiente nivel (null si es el máximo). */
  xpToNext: number | null;
};

const GLOBAL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000];

/** Nombre del nivel global n (1..10), resuelto server-side vía i18n. */
export function levelName(n: number): string {
  return t(`level.${n}`);
}

function levelInfo(
  totalXp: number,
  thresholds: number[]
): { level: number; xpRequired: number; xpToNext: number | null } {
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (totalXp >= thresholds[i]) level = i + 1;
  }
  const idx = level - 1;
  const xpRequired = thresholds[idx];
  const xpToNext = idx + 1 < thresholds.length ? thresholds[idx + 1] : null;
  return { level, xpRequired, xpToNext };
}

export function getGlobalLevel(totalXp: number): GlobalLevel {
  const info = levelInfo(totalXp, GLOBAL_THRESHOLDS);
  return {
    ...info,
    name: levelName(info.level),
  };
}

export const GAMIFICATION_LEVELS = {
  global: { thresholds: GLOBAL_THRESHOLDS },
} as const;
