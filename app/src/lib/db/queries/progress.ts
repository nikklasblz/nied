/**
 * Queries sobre `unit_progress`.
 */

import type Database from "better-sqlite3";

export type UnitProgressRow = {
  track_id: string;
  unit_id: string;
  status: "pendiente" | "en-progreso" | "completa";
  started_at: string | null;
  completed_at: string | null;
};

export function getUnitProgress(
  db: Database.Database,
  trackId: string,
  unitId: string
): UnitProgressRow | null {
  const row = db
    .prepare(
      `SELECT track_id, unit_id, status, started_at, completed_at
       FROM unit_progress WHERE track_id = ? AND unit_id = ?`
    )
    .get(trackId, unitId) as UnitProgressRow | undefined;
  return row ?? null;
}

export function setUnitComplete(
  db: Database.Database,
  trackId: string,
  unitId: string
): void {
  db.prepare(
    `INSERT INTO unit_progress (track_id, unit_id, status, started_at, completed_at)
     VALUES (?, ?, 'completa', datetime('now'), datetime('now'))
     ON CONFLICT(track_id, unit_id) DO UPDATE SET
       status = 'completa',
       started_at = COALESCE(unit_progress.started_at, datetime('now')),
       completed_at = datetime('now')`
  ).run(trackId, unitId);
}

export function setUnitPending(
  db: Database.Database,
  trackId: string,
  unitId: string
): void {
  db.prepare(
    `INSERT INTO unit_progress (track_id, unit_id, status)
     VALUES (?, ?, 'pendiente')
     ON CONFLICT(track_id, unit_id) DO UPDATE SET
       status = 'pendiente',
       completed_at = NULL`
  ).run(trackId, unitId);
}

export function countCompletedUnits(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM unit_progress WHERE status = 'completa'`
    )
    .get() as { c: number };
  return row.c;
}

export function countCompletedUnitsByTrack(
  db: Database.Database,
  trackId: string
): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM unit_progress
       WHERE status = 'completa' AND track_id = ?`
    )
    .get(trackId) as { c: number };
  return row.c;
}

export function getAllProgress(db: Database.Database): UnitProgressRow[] {
  return db
    .prepare(
      `SELECT track_id, unit_id, status, started_at, completed_at
       FROM unit_progress ORDER BY track_id, unit_id`
    )
    .all() as UnitProgressRow[];
}
