/**
 * Queries sobre `quiz_attempts`.
 */

import type Database from "better-sqlite3";

export interface QuizAttemptRow {
  id: number;
  course_id: string;
  unit_id: string;
  question_index: number;
  selected_answer: number;
  correct: number;
  xp_awarded: number;
  attempted_at: string;
}

/** Devuelve todos los intentos de quiz para un course+unidad, ordenados por question_index. */
export function getQuizAttempts(
  db: Database.Database,
  courseId: string,
  unitId: string
): QuizAttemptRow[] {
  return db
    .prepare(
      "SELECT * FROM quiz_attempts WHERE course_id = ? AND unit_id = ? ORDER BY question_index"
    )
    .all(courseId, unitId) as QuizAttemptRow[];
}

/** Inserta un intento de quiz en la base de datos. */
export function insertQuizAttempt(
  db: Database.Database,
  data: {
    courseId: string;
    unitId: string;
    questionIndex: number;
    selectedAnswer: number;
    correct: boolean;
    xpAwarded: number;
  }
): void {
  db.prepare(
    `INSERT INTO quiz_attempts (course_id, unit_id, question_index, selected_answer, correct, xp_awarded)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    data.courseId,
    data.unitId,
    data.questionIndex,
    data.selectedAnswer,
    data.correct ? 1 : 0,
    data.xpAwarded
  );
}

/**
 * Devuelve true si el usuario ya respondió correctamente esta pregunta.
 * Se usa para idempotencia: no volver a otorgar XP en recargas.
 */
export function hasAttemptedQuestion(
  db: Database.Database,
  courseId: string,
  unitId: string,
  questionIndex: number
): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM quiz_attempts WHERE course_id = ? AND unit_id = ? AND question_index = ? AND correct = 1 LIMIT 1"
    )
    .get(courseId, unitId, questionIndex);
  return !!row;
}
