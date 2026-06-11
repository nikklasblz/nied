"use server";

/**
 * Server action: procesa la respuesta a una pregunta de quiz.
 *
 * Pipeline:
 *  1. Verifica idempotencia (ya respondida correctamente → no XP).
 *  2. Si es correcta: toca racha, aplica multiplicador, inserta evento XP.
 *  3. Registra el intento en quiz_attempts.
 *  4. Crea la card SRS (Leitner caja 1, due mañana) si no existe.
 *  5. Invalida cache de la ruta.
 */

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { insertQuizAttempt, hasAttemptedQuestion } from "@/lib/db/queries/quiz";
import { insertXpEvent } from "@/lib/db/queries/xp";
import { upsertCard } from "@/lib/db/queries/srs";
import { nextDueDate } from "@/lib/srs/leitner";
import { recordActivity, toIsoDate } from "@/lib/gamification/streaks";
import { applyMultiplier } from "@/lib/gamification/xp";

export type SubmitQuizAnswerResult = {
  correct: boolean;
  explanation: string;
  xpAwarded: number;
  alreadyAnswered: boolean;
};

export async function submitQuizAnswer(
  courseId: string,
  unitId: string,
  questionIndex: number,
  selectedAnswer: number,
  correctAnswer: number,
  explanation: string,
  xpPerQuestion: number
): Promise<SubmitQuizAnswerResult> {
  const db = getDb();
  const correct = selectedAnswer === correctAnswer;

  // Idempotencia: si ya respondió correctamente, no volver a dar XP
  const already = hasAttemptedQuestion(db, courseId, unitId, questionIndex);
  if (already) {
    return {
      correct,
      explanation,
      xpAwarded: 0,
      alreadyAnswered: true,
    };
  }

  const xpBase = correct ? xpPerQuestion : 0;

  const result = db.transaction(() => {
    const today = toIsoDate(new Date());
    const streak = recordActivity(db, today);
    const finalXp = correct ? applyMultiplier(xpBase, streak.multiplier) : 0;

    insertQuizAttempt(db, {
      courseId,
      unitId,
      questionIndex,
      selectedAnswer,
      correct,
      xpAwarded: finalXp,
    });

    // SRS: la pregunta entra al sistema Leitner en caja 1, due mañana.
    const srsToday = new Date().toISOString().slice(0, 10);
    upsertCard(db, courseId, unitId, questionIndex, nextDueDate(1, srsToday));

    if (correct && finalXp > 0) {
      insertXpEvent(db, {
        activity: "quiz-correct",
        courseId,
        unitId,
        xp: finalXp,
        multiplier: streak.multiplier,
      });
    }

    return { finalXp, multiplier: streak.multiplier };
  })();

  try {
    revalidatePath("/");
    revalidatePath(`/courses/${courseId}/${unitId}`);
  } catch {
    // revalidatePath puede fallar fuera del contexto de render — ignorar
  }

  return {
    correct,
    explanation,
    xpAwarded: result.finalXp,
    alreadyAnswered: false,
  };
}
