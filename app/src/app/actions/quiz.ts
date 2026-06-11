"use server";

/**
 * Server action: procesa la respuesta a una pregunta de quiz.
 *
 * Pipeline:
 *  1. Carga el quiz desde el servidor (no confía en datos del cliente).
 *  2. Verifica idempotencia (ya respondida correctamente → no XP).
 *  3. Si es correcta: toca racha, aplica multiplicador, inserta evento XP.
 *  4. Registra el intento en quiz_attempts.
 *  5. Crea la card SRS (Leitner caja 1, due mañana) si no existe.
 *  6. Invalida cache de la ruta.
 */

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { insertQuizAttempt, hasAttemptedQuestion } from "@/lib/db/queries/quiz";
import { insertXpEvent } from "@/lib/db/queries/xp";
import { upsertCard } from "@/lib/db/queries/srs";
import { nextDueDate } from "@/lib/srs/leitner";
import { recordActivity, toIsoDate } from "@/lib/gamification/streaks";
import { applyMultiplier } from "@/lib/gamification/xp";
import { loadQuiz } from "@/lib/content/quiz-loader";

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
  selectedAnswer: number
): Promise<SubmitQuizAnswerResult> {
  const quiz = loadQuiz(courseId, unitId);
  if (!quiz) {
    throw new Error(`Quiz no encontrado: ${courseId}/${unitId}`);
  }
  const q = quiz.questions[questionIndex];
  if (!q) {
    throw new Error(`Pregunta fuera de rango: índice ${questionIndex}`);
  }

  const db = getDb();
  const correct = selectedAnswer === q.correct_index;

  // Idempotencia: si ya respondió correctamente, no volver a dar XP
  const already = hasAttemptedQuestion(db, courseId, unitId, questionIndex);
  if (already) {
    return {
      correct,
      explanation: q.explanation,
      xpAwarded: 0,
      alreadyAnswered: true,
    };
  }

  const xpBase = correct ? quiz.xp_per_question : 0;

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
    // Usamos la misma fecha local que el resto del pipeline (toIsoDate).
    upsertCard(db, courseId, unitId, questionIndex, nextDueDate(1, today));

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
    explanation: q.explanation,
    xpAwarded: result.finalXp,
    alreadyAnswered: false,
  };
}
