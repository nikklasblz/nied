"use server";

/**
 * Server action: registra actividad para hoy y devuelve el multiplicador
 * a aplicar a los XP que están por insertarse.
 *
 * Llamado desde `awardXp` antes de calcular el evento.
 */

import { getDb } from "@/lib/db/client";
import { recordActivity, toIsoDate } from "@/lib/gamification/streaks";

export async function touchStreak() {
  const db = getDb();
  const today = toIsoDate(new Date());
  const result = recordActivity(db, today);
  return result;
}
