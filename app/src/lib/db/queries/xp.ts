/**
 * Queries sobre `xp_events`.
 */

import type Database from "better-sqlite3";

export type XpEventRow = {
  id: number;
  activity: string;
  course_id: string | null;
  unit_id: string | null;
  xp: number;
  multiplier: number;
  occurred_at: string;
};

/** Inserta un evento de XP y devuelve el id del row. */
export function insertXpEvent(
  db: Database.Database,
  args: {
    activity: string;
    courseId: string | null;
    unitId: string | null;
    xp: number;
    multiplier: number;
  }
): number {
  const stmt = db.prepare(
    `INSERT INTO xp_events (activity, course_id, unit_id, xp, multiplier)
     VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    args.activity,
    args.courseId,
    args.unitId,
    args.xp,
    args.multiplier
  );
  return Number(info.lastInsertRowid);
}

/** XP total acumulado (suma de todos los eventos). */
export function getTotalXp(db: Database.Database): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(xp), 0) AS total FROM xp_events`)
    .get() as { total: number };
  return row.total;
}

/** XP total por course (filtrado por course_id no nulo). */
export function getTotalXpByCourse(
  db: Database.Database,
  courseId: string
): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(xp), 0) AS total FROM xp_events WHERE course_id = ?`
    )
    .get(courseId) as { total: number };
  return row.total;
}

/** Cuenta de eventos en un rango horario local [horaIni, horaFin) sobre la fecha del evento. */
export function countEventsByHourBucket(
  db: Database.Database,
  args: {
    activity: string;
    hourStart: number; // 0-23 inclusive
    hourEnd: number; // 0-24 exclusive
  }
): number {
  // SQLite `strftime('%H', occurred_at)` da hora UTC en string. Para v0.3 esto
  // basta — el usuario corre el server localmente, ajustaremos timezone luego.
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM xp_events
       WHERE activity = ?
         AND CAST(strftime('%H', occurred_at) AS INTEGER) >= ?
         AND CAST(strftime('%H', occurred_at) AS INTEGER) < ?`
    )
    .get(args.activity, args.hourStart, args.hourEnd) as { c: number };
  return row.c;
}

/** Distintos course_ids con al menos una unidad completada. */
export function getDistinctCourseIdsWithProgress(
  db: Database.Database
): string[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT course_id FROM unit_progress WHERE status = 'completa' AND course_id IS NOT NULL`
    )
    .all() as { course_id: string }[];
  return rows.map((r) => r.course_id);
}
