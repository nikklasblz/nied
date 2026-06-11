"use server";

/**
 * Server action: otorga XP por una actividad arbitraria.
 *
 * Pipeline:
 *  1. Toca racha (touchStreak) → obtiene multiplicador del día.
 *  2. Aplica multiplicador al XP base.
 *  3. Inserta evento en `xp_events`.
 */

import { getDb } from "@/lib/db/client";
import { insertXpEvent } from "@/lib/db/queries/xp";
import { applyMultiplier, type Activity } from "@/lib/gamification/xp";
import { recordActivity, toIsoDate } from "@/lib/gamification/streaks";

export async function awardXp(args: {
  activity: Activity;
  courseId: string | null;
  unitId: string | null;
  baseXp: number;
}) {
  const db = getDb();
  const today = toIsoDate(new Date());
  const streak = recordActivity(db, today);
  const finalXp = applyMultiplier(args.baseXp, streak.multiplier);

  insertXpEvent(db, {
    activity: args.activity,
    courseId: args.courseId,
    unitId: args.unitId,
    xp: finalXp,
    multiplier: streak.multiplier,
  });

  return {
    xp: finalXp,
    baseXp: args.baseXp,
    multiplier: streak.multiplier,
    streak,
  };
}
