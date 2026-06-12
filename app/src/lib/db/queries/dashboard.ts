/**
 * Queries agregadas para el dashboard de niED.
 *
 * Combina XP, niveles, racha, heatmap y achievements recientes en un solo
 * objeto. Está pensado para consumirse desde un Server Component.
 */

import type Database from "better-sqlite3";
import { getTotalXp } from "./xp";
import { getStreak } from "./streaks";
import { listUnlocked } from "./achievements";
import { getAllProgress, type UnitProgressRow } from "./progress";
import { getGlobalLevel, type GlobalLevel } from "../../gamification/levels";
import { getMultiplierForStreak } from "../../gamification/streaks";

export type HeatmapDay = {
  date: string; // YYYY-MM-DD
  xp: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type DashboardData = {
  totalXp: number;
  level: GlobalLevel;
  streak: {
    current: number;
    longest: number;
    multiplier: number;
    last_activity_date: string | null;
  };
  heatmap: HeatmapDay[];
  recentAchievements: { achievement_id: string; unlocked_at: string }[];
  progress: UnitProgressRow[];
};

/** Devuelve XP por día (YYYY-MM-DD) en los últimos `days` (incluyendo hoy). */
export function getXpByDate(
  db: Database.Database,
  days: number
): Map<string, number> {
  const rows = db
    .prepare(
      `SELECT date(occurred_at, 'localtime') AS d, SUM(xp) AS xp
       FROM xp_events
       WHERE occurred_at >= datetime('now', ?)
       GROUP BY date(occurred_at, 'localtime')`
    )
    .all(`-${days} days`) as { d: string; xp: number }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.d) map.set(r.d, r.xp);
  }
  return map;
}

/** Convierte XP del día a un nivel discreto 0..4 para el heatmap. */
function bucketize(xp: number): 0 | 1 | 2 | 3 | 4 {
  if (xp <= 0) return 0;
  if (xp <= 25) return 1;
  if (xp <= 75) return 2;
  if (xp <= 150) return 3;
  return 4;
}

/** Construye 365 días (hoy hacia atrás) con XP y bucket. */
export function buildHeatmap(
  db: Database.Database,
  days: number = 365
): HeatmapDay[] {
  const xpByDate = getXpByDate(db, days);
  const out: HeatmapDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const iso = `${yyyy}-${mm}-${dd}`;
    const xp = xpByDate.get(iso) ?? 0;
    out.push({ date: iso, xp, level: bucketize(xp) });
  }
  return out;
}

/** Bundle completo para el dashboard. */
export function getDashboardData(db: Database.Database): DashboardData {
  const totalXp = getTotalXp(db);
  const level = getGlobalLevel(totalXp);
  const streakRow = getStreak(db);
  const streak = {
    current: streakRow.current_streak,
    longest: streakRow.longest_streak,
    multiplier: getMultiplierForStreak(streakRow.current_streak),
    last_activity_date: streakRow.last_activity_date,
  };
  const heatmap = buildHeatmap(db, 365);
  const recentAchievements = listUnlocked(db).slice(-5).reverse();
  const progress = getAllProgress(db);

  return {
    totalXp,
    level,
    streak,
    heatmap,
    recentAchievements,
    progress,
  };
}
