/**
 * Catálogo de logros (achievements) v0.3 de niED.
 *
 * Son los 10 core. Los 30 finales del diseño §10.4 vendrán más adelante.
 * Títulos y descripciones viven en i18n (achievement.<id>.title / .desc);
 * la UI los resuelve server-side vía achievementTitle / achievementDesc.
 */

import type Database from "better-sqlite3";
import {
  isUnlocked,
  listUnlocked,
  unlock,
} from "../db/queries/achievements";
import {
  countCompletedUnits,
  countCompletedUnitsByCourse,
} from "../db/queries/progress";
import {
  countEventsByHourBucket,
  getDistinctCourseIdsWithProgress,
  getTotalXp,
} from "../db/queries/xp";
import { getStreak } from "../db/queries/streaks";
import { getGlobalLevel } from "./levels";
import { t } from "../i18n";

export type Achievement = {
  id: string;
  icon: string; // nombre de icono Lucide (ej "Award", "Flame")
  evaluate: (db: Database.Database) => boolean;
};

/** Título traducido del achievement (server-side). */
export function achievementTitle(id: string): string {
  return t(`achievement.${id}.title`);
}

/** Descripción traducida del achievement (server-side). */
export function achievementDesc(id: string): string {
  return t(`achievement.${id}.desc`);
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "primer-paso",
    icon: "Flag",
    evaluate: (db) => countCompletedUnits(db) >= 1,
  },
  {
    id: "cinco-unidades",
    icon: "Layers",
    evaluate: (db) => {
      // Pregunta por cualquier course con >=5 unidades completas.
      const courses = getDistinctCourseIdsWithProgress(db);
      return courses.some((c) => countCompletedUnitsByCourse(db, c) >= 5);
    },
  },
  {
    id: "track-iniciado",
    icon: "Sparkles",
    evaluate: (db) => getDistinctCourseIdsWithProgress(db).length >= 3,
  },
  {
    id: "racha-7",
    icon: "Flame",
    evaluate: (db) => getStreak(db).current_streak >= 7,
  },
  {
    id: "racha-30",
    icon: "Flame",
    evaluate: (db) => getStreak(db).current_streak >= 30,
  },
  {
    id: "xp-mil",
    icon: "Zap",
    evaluate: (db) => getTotalXp(db) >= 1000,
  },
  {
    id: "xp-cinco-mil",
    icon: "Zap",
    evaluate: (db) => getTotalXp(db) >= 5000,
  },
  {
    id: "nivel-tres",
    icon: "Trophy",
    evaluate: (db) => getGlobalLevel(getTotalXp(db)).level >= 3,
  },
  {
    id: "nocturno",
    icon: "Moon",
    evaluate: (db) => {
      // 22-24 + 00-04
      const a = countEventsByHourBucket(db, {
        activity: "unit-complete",
        hourStart: 22,
        hourEnd: 24,
      });
      const b = countEventsByHourBucket(db, {
        activity: "unit-complete",
        hourStart: 0,
        hourEnd: 4,
      });
      return a + b >= 5;
    },
  },
  {
    id: "madrugador",
    icon: "Sunrise",
    evaluate: (db) =>
      countEventsByHourBucket(db, {
        activity: "unit-complete",
        hourStart: 5,
        hourEnd: 9,
      }) >= 5,
  },
];

/**
 * Recorre los achievements aún no desbloqueados, evalúa cuáles aplican ahora,
 * y los marca como desbloqueados. Devuelve la lista de los recién desbloqueados.
 */
export function evaluateAndUnlock(
  db: Database.Database
): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (isUnlocked(db, ach.id)) continue;
    if (ach.evaluate(db)) {
      unlock(db, ach.id);
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

/** Devuelve catálogo + estado de cada achievement (para UI). */
export function getAchievementsState(db: Database.Database): {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt: string | null;
}[] {
  const unlockedRows = listUnlocked(db);
  const byId = new Map(unlockedRows.map((r) => [r.achievement_id, r.unlocked_at]));
  return ACHIEVEMENTS.map((a) => ({
    achievement: a,
    unlocked: byId.has(a.id),
    unlockedAt: byId.get(a.id) ?? null,
  }));
}
