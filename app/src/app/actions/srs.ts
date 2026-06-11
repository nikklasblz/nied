"use server";

/**
 * Server actions del sistema SRS (Leitner).
 *
 * - getDueCardViews: une las cards vencidas con el contenido del quiz
 *   correspondiente (las cards huérfanas — quiz cambiado — se ignoran).
 * - submitReview: regradúa la card releyendo el box del servidor
 *   (no se confía en datos del cliente).
 */

import { getDb } from "@/lib/db/client";
import { gradeCard, nextDueDate } from "@/lib/srs/leitner";
import { getDueCards, reviewCard } from "@/lib/db/queries/srs";
import { loadQuiz } from "@/lib/content/quiz-loader";
import { toIsoDate } from "@/lib/gamification/streaks";

export interface DueCardView {
  courseId: string;
  unitId: string;
  questionIndex: number;
  box: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export async function getDueCardViews(): Promise<DueCardView[]> {
  const db = getDb();
  const rows = getDueCards(db, toIsoDate(new Date()));
  const out: DueCardView[] = [];
  for (const r of rows) {
    const quiz = loadQuiz(r.course_id, r.unit_id);
    const q = quiz?.questions[r.question_index];
    if (!q) continue; // card huérfana (quiz cambió): se ignora
    out.push({
      courseId: r.course_id,
      unitId: r.unit_id,
      questionIndex: r.question_index,
      box: r.box,
      question: q.question,
      options: q.options,
      correctIndex: q.correct_index,
      explanation: q.explanation,
    });
  }
  return out;
}

export async function submitReview(
  courseId: string,
  unitId: string,
  questionIndex: number,
  correct: boolean
): Promise<{ newBox: number; nextDue: string }> {
  const db = getDb();
  const today = toIsoDate(new Date());
  // Releer el box actual del servidor (no confiar en el cliente)
  const row = getDueCards(db, today, 1000).find(
    (c) =>
      c.course_id === courseId &&
      c.unit_id === unitId &&
      c.question_index === questionIndex
  );
  if (!row) throw new Error("card not due or not found");
  const newBox = gradeCard(row.box, correct);
  const nextDue = nextDueDate(newBox, today);
  reviewCard(
    db,
    courseId,
    unitId,
    questionIndex,
    newBox,
    nextDue,
    new Date().toISOString()
  );
  return { newBox, nextDue };
}
