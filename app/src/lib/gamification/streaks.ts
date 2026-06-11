/**
 * Lógica de rachas (streaks) para niED.
 *
 * Reglas (diseño §10.3):
 *  - Un día con ≥1 evento de XP cuenta como activo.
 *  - Si el último día activo fue ayer → streak +1.
 *  - Si fue hoy → no-op.
 *  - Si fue hace 2 días: se gasta el "freeze" automático de la semana ISO actual
 *    (si no se gastó ya esta semana) y la racha sigue +1.
 *  - Si fue hace ≥3 días o el freeze ya se gastó → racha vuelve a 1.
 *
 * Multiplicadores:
 *  - <7 días → ×1.0
 *  - 7-29 → ×1.25
 *  - ≥30 → ×1.5
 */

import type Database from "better-sqlite3";
import { getStreak, updateStreak } from "../db/queries/streaks";

const MS_PER_DAY = 86_400_000;

/** Devuelve fecha local YYYY-MM-DD a partir de Date. */
export function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Diferencia en días entre dos fechas YYYY-MM-DD (ambas locales). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / MS_PER_DAY);
}

/** Semana ISO en formato `YYYY-WNN` derivada de una fecha YYYY-MM-DD. */
export function isoWeekOf(date: string): string {
  // Cálculo ISO 8601 estándar.
  const d = new Date(`${date}T00:00:00`);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // lun=0..dom=6
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - firstThursday.getTime();
  const week = 1 + Math.round(diff / (7 * MS_PER_DAY));
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type StreakUpdateResult = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
  multiplier: number;
  used_freeze: boolean;
};

/** Calcula multiplicador a partir del streak actual. */
export function getMultiplierForStreak(currentStreak: number): number {
  if (currentStreak >= 30) return 1.5;
  if (currentStreak >= 7) return 1.25;
  return 1.0;
}

/**
 * Registra actividad del usuario en la fecha dada y actualiza la fila de streaks.
 * Devuelve el estado resultante (incluido el multiplicador a aplicar).
 */
export function recordActivity(
  db: Database.Database,
  todayIso: string
): StreakUpdateResult {
  const row = getStreak(db);
  let current = row.current_streak;
  let longest = row.longest_streak;
  let usedFreeze = false;
  let freezeWeek = row.freeze_used_iso_week;

  if (!row.last_activity_date) {
    // Primer día de actividad histórico.
    current = 1;
  } else {
    const diff = daysBetween(row.last_activity_date, todayIso);
    if (diff === 0) {
      // Ya activo hoy — no cambia.
    } else if (diff === 1) {
      current += 1;
    } else if (diff === 2) {
      const week = isoWeekOf(todayIso);
      if (freezeWeek !== week) {
        // Freeze automático disponible para esta semana.
        current += 1;
        freezeWeek = week;
        usedFreeze = true;
      } else {
        current = 1;
      }
    } else {
      current = 1;
    }
  }

  if (current > longest) longest = current;

  updateStreak(db, {
    current_streak: current,
    longest_streak: longest,
    last_activity_date: todayIso,
    freeze_used_iso_week: freezeWeek,
  });

  return {
    current_streak: current,
    longest_streak: longest,
    last_activity_date: todayIso,
    multiplier: getMultiplierForStreak(current),
    used_freeze: usedFreeze,
  };
}

/** Obtiene la racha actual leyendo la DB. */
export function getCurrentStreak(db: Database.Database): {
  current: number;
  longest: number;
  multiplier: number;
} {
  const row = getStreak(db);
  return {
    current: row.current_streak,
    longest: row.longest_streak,
    multiplier: getMultiplierForStreak(row.current_streak),
  };
}
