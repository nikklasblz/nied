/**
 * Queries sobre la tabla `streaks` (single-row).
 */

import type Database from "better-sqlite3";

export type StreakRow = {
  id: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  freeze_used_iso_week: string | null;
};

export function getStreak(db: Database.Database): StreakRow {
  const row = db
    .prepare(`SELECT * FROM streaks WHERE id = 1`)
    .get() as StreakRow;
  return row;
}

export function updateStreak(
  db: Database.Database,
  args: {
    current_streak: number;
    longest_streak: number;
    last_activity_date: string;
    freeze_used_iso_week: string | null;
  }
): void {
  db.prepare(
    `UPDATE streaks SET
       current_streak = ?,
       longest_streak = ?,
       last_activity_date = ?,
       freeze_used_iso_week = ?
     WHERE id = 1`
  ).run(
    args.current_streak,
    args.longest_streak,
    args.last_activity_date,
    args.freeze_used_iso_week
  );
}
