/**
 * Queries sobre `srs_cards` (Leitner SRS).
 */

import type Database from "better-sqlite3";

export interface SrsCardRow {
  course_id: string;
  unit_id: string;
  question_index: number;
  box: number;
  due_date: string;
}

/** Crea la card si no existe (al responder una pregunta de quiz por primera vez). */
export function upsertCard(
  db: Database.Database,
  courseId: string,
  unitId: string,
  qIdx: number,
  dueDate: string
): void {
  db.prepare(
    `INSERT INTO srs_cards (course_id, unit_id, question_index, box, due_date)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(course_id, unit_id, question_index) DO NOTHING`
  ).run(courseId, unitId, qIdx, dueDate);
}

export function getDueCards(
  db: Database.Database,
  todayIso: string,
  limit = 30
): SrsCardRow[] {
  return db
    .prepare(
      `SELECT course_id, unit_id, question_index, box, due_date
       FROM srs_cards WHERE due_date <= ? ORDER BY due_date LIMIT ?`
    )
    .all(todayIso, limit) as SrsCardRow[];
}

export function reviewCard(
  db: Database.Database,
  courseId: string,
  unitId: string,
  qIdx: number,
  newBox: number,
  newDue: string,
  nowIso: string
): void {
  db.prepare(
    `UPDATE srs_cards SET box = ?, due_date = ?, last_reviewed_at = ?
     WHERE course_id = ? AND unit_id = ? AND question_index = ?`
  ).run(newBox, newDue, nowIso, courseId, unitId, qIdx);
}

export function countDue(db: Database.Database, todayIso: string): number {
  return (
    db
      .prepare(`SELECT COUNT(*) AS n FROM srs_cards WHERE due_date <= ?`)
      .get(todayIso) as { n: number }
  ).n;
}
