/**
 * Queries sobre `unit_progress`.
 */

import type Database from "better-sqlite3";

export type UnitProgressRow = {
  course_id: string;
  unit_id: string;
  status: "pendiente" | "en-progreso" | "completa";
  started_at: string | null;
  completed_at: string | null;
};

export function getUnitProgress(
  db: Database.Database,
  courseId: string,
  unitId: string
): UnitProgressRow | null {
  const row = db
    .prepare(
      `SELECT course_id, unit_id, status, started_at, completed_at
       FROM unit_progress WHERE course_id = ? AND unit_id = ?`
    )
    .get(courseId, unitId) as UnitProgressRow | undefined;
  return row ?? null;
}

export function setUnitComplete(
  db: Database.Database,
  courseId: string,
  unitId: string
): void {
  db.prepare(
    `INSERT INTO unit_progress (course_id, unit_id, status, started_at, completed_at)
     VALUES (?, ?, 'completa', datetime('now'), datetime('now'))
     ON CONFLICT(course_id, unit_id) DO UPDATE SET
       status = 'completa',
       started_at = COALESCE(unit_progress.started_at, datetime('now')),
       completed_at = datetime('now')`
  ).run(courseId, unitId);
}

export function setUnitPending(
  db: Database.Database,
  courseId: string,
  unitId: string
): void {
  db.prepare(
    `INSERT INTO unit_progress (course_id, unit_id, status)
     VALUES (?, ?, 'pendiente')
     ON CONFLICT(course_id, unit_id) DO UPDATE SET
       status = 'pendiente',
       completed_at = NULL`
  ).run(courseId, unitId);
}

export function countCompletedUnits(db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM unit_progress WHERE status = 'completa'`
    )
    .get() as { c: number };
  return row.c;
}

export function countCompletedUnitsByCourse(
  db: Database.Database,
  courseId: string
): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM unit_progress
       WHERE status = 'completa' AND course_id = ?`
    )
    .get(courseId) as { c: number };
  return row.c;
}

export function getAllProgress(db: Database.Database): UnitProgressRow[] {
  return db
    .prepare(
      `SELECT course_id, unit_id, status, started_at, completed_at
       FROM unit_progress ORDER BY course_id, unit_id`
    )
    .all() as UnitProgressRow[];
}
