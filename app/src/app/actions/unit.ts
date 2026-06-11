"use server";

/**
 * Server action: marca una unidad como completa.
 *
 * Pipeline (diseño §13):
 *  1. Lee el sílabo y obtiene la metadata de la unidad (xp base).
 *  2. Marca progreso = 'completa' en `unit_progress`.
 *  3. Toca racha y obtiene multiplicador.
 *  4. Inserta evento en `xp_events` con xp final.
 *  5. Evalúa achievements y desbloquea los nuevos.
 *  6. Revalida rutas relevantes.
 */

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { getUnit } from "@/lib/content/loader";
import {
  getUnitProgress,
  setUnitComplete,
  setUnitPending,
} from "@/lib/db/queries/progress";
import { insertXpEvent } from "@/lib/db/queries/xp";
import {
  evaluateAndUnlock,
  type Achievement,
} from "@/lib/gamification/achievements";
import { recordActivity, toIsoDate } from "@/lib/gamification/streaks";
import { applyMultiplier, XP_RULES } from "@/lib/gamification/xp";

/**
 * Wrapper de `revalidatePath` que no-opera cuando el runtime de Next no
 * está disponible (e.g., dentro del smoke test ejecutado con tsx). En
 * runtime de Next funciona idéntico al original.
 */
function safeRevalidate(p: string): void {
  try {
    revalidatePath(p);
  } catch (err) {
    // Ejecución fuera de Next (p.ej. smoke). Ignoramos silenciosamente:
    // la cache no existe en ese contexto.
    if (process.env.NIED_DEBUG_REVALIDATE) {
      console.warn(`[safeRevalidate] no-op (${p}):`, (err as Error).message);
    }
  }
}

export type MarkUnitCompleteResult = {
  ok: true;
  xpAwarded: number;
  baseXp: number;
  multiplier: number;
  streak: {
    current: number;
    longest: number;
    used_freeze: boolean;
  };
  newAchievements: Pick<Achievement, "id" | "titulo" | "descripcion" | "icon">[];
  alreadyComplete?: boolean;
};

export async function markUnitComplete(
  trackId: string,
  unitId: string
): Promise<MarkUnitCompleteResult | { ok: false; error: string }> {
  const ctx = await getUnit(trackId, unitId);
  if (!ctx) {
    return { ok: false, error: `Unidad no encontrada: ${trackId}/${unitId}` };
  }
  const db = getDb();

  // Guard de idempotencia: si la unidad ya está completa, no duplicar
  // XP ni ejecutar el pipeline. El historial XP es auditable y único por
  // completion event.
  const existing = getUnitProgress(db, trackId, unitId);
  if (existing && existing.status === "completa") {
    return {
      ok: true,
      xpAwarded: 0,
      baseXp: 0,
      multiplier: 1.0,
      streak: {
        current: 0,
        longest: 0,
        used_freeze: false,
      },
      newAchievements: [],
      alreadyComplete: true,
    };
  }

  // Pipeline atómico: setUnitComplete → recordActivity → insertXpEvent →
  // evaluateAndUnlock. Si algo falla, nada queda persistido.
  const baseXp = XP_RULES.unitComplete(ctx.unit);
  const today = toIsoDate(new Date());

  const txResult = db.transaction(() => {
    setUnitComplete(db, trackId, unitId);
    const streak = recordActivity(db, today);
    const finalXp = applyMultiplier(baseXp, streak.multiplier);
    insertXpEvent(db, {
      activity: "unit-complete",
      trackId,
      unitId,
      xp: finalXp,
      multiplier: streak.multiplier,
    });
    const newlyUnlocked = evaluateAndUnlock(db);
    return { streak, finalXp, newlyUnlocked };
  })();

  safeRevalidate("/");
  safeRevalidate("/tracks");
  safeRevalidate(`/tracks/${trackId}`);
  safeRevalidate(`/tracks/${trackId}/${unitId}`);

  return {
    ok: true,
    xpAwarded: txResult.finalXp,
    baseXp,
    multiplier: txResult.streak.multiplier,
    streak: {
      current: txResult.streak.current_streak,
      longest: txResult.streak.longest_streak,
      used_freeze: txResult.streak.used_freeze,
    },
    newAchievements: txResult.newlyUnlocked.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      descripcion: a.descripcion,
      icon: a.icon,
    })),
  };
}

/**
 * Vuelve a marcar una unidad como pendiente. NO devuelve XP — el evento
 * histórico permanece en `xp_events` por auditabilidad.
 */
export async function unmarkUnitComplete(
  trackId: string,
  unitId: string
): Promise<{ ok: true }> {
  const db = getDb();
  setUnitPending(db, trackId, unitId);
  safeRevalidate("/");
  safeRevalidate("/tracks");
  safeRevalidate(`/tracks/${trackId}`);
  safeRevalidate(`/tracks/${trackId}/${unitId}`);
  return { ok: true };
}
