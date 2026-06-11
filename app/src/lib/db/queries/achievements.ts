/**
 * Queries sobre `achievements_unlocked`.
 */

import type Database from "better-sqlite3";

export type AchievementUnlockedRow = {
  achievement_id: string;
  unlocked_at: string;
};

export function isUnlocked(
  db: Database.Database,
  achievementId: string
): boolean {
  const row = db
    .prepare(`SELECT 1 FROM achievements_unlocked WHERE achievement_id = ?`)
    .get(achievementId);
  return Boolean(row);
}

export function unlock(db: Database.Database, achievementId: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO achievements_unlocked (achievement_id) VALUES (?)`
  ).run(achievementId);
}

export function listUnlocked(
  db: Database.Database
): AchievementUnlockedRow[] {
  return db
    .prepare(
      `SELECT achievement_id, unlocked_at FROM achievements_unlocked ORDER BY unlocked_at`
    )
    .all() as AchievementUnlockedRow[];
}
