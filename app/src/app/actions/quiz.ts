"use server";

/**
 * Server action: processes a quiz answer of any type.
 * Loads the quiz server-side (never trusts the client), grades with the pure
 * gradeQuestion, then (if correct) touches the streak, applies the multiplier,
 * inserts the XP event, records the attempt, and creates an SRS card.
 */

import { revalidatePath } from "next/cache";
import { gradeQuestion, type QuizResponse } from "@nied/schema";
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
  response: QuizResponse
): Promise<SubmitQuizAnswerResult> {
  const quiz = loadQuiz(courseId, unitId);
  if (!quiz) throw new Error(`Quiz no encontrado: ${courseId}/${unitId}`);
  const q = quiz.questions[questionIndex];
  if (!q) throw new Error(`Pregunta fuera de rango: índice ${questionIndex}`);

  const db = getDb();
  const correct = gradeQuestion(q, response);

  const already = hasAttemptedQuestion(db, courseId, unitId, questionIndex);
  if (already) {
    return { correct, explanation: q.explanation, xpAwarded: 0, alreadyAnswered: true };
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
      response: JSON.stringify(response),
      correct,
      xpAwarded: finalXp,
    });

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
    /* revalidatePath may fail outside a render context — ignore */
  }

  return { correct, explanation: q.explanation, xpAwarded: result.finalXp, alreadyAnswered: false };
}
