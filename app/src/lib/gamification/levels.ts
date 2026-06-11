/**
 * Niveles globales (10) y por track (5) para niED.
 *
 * Los thresholds son XP acumulados — el usuario nunca pierde XP, así que el
 * nivel solo crece. Nombres alineados con el diseño §10 (Aprendiz → Maestría plena).
 */

export type GlobalLevel = {
  level: number;
  name: string;
  xpRequired: number;
  /** XP necesarios para alcanzar el siguiente nivel (null si es el máximo). */
  xpToNext: number | null;
};

const GLOBAL_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000];

const GLOBAL_NAMES = [
  "Aprendiz",
  "Iniciado",
  "Constante",
  "Practicante",
  "Aplicado",
  "Especializado",
  "Avanzado",
  "Experto",
  "Maestro",
  "Maestría plena",
];

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
    name: GLOBAL_NAMES[info.level - 1],
  };
}

export const GAMIFICATION_LEVELS = {
  global: { thresholds: GLOBAL_THRESHOLDS, names: GLOBAL_NAMES },
} as const;
