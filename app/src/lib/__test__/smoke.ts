/**
 * Smoke test end-to-end del backend de niED.
 *
 * Ejecución: `bun src/lib/__test__/smoke.ts`
 *
 * Usa una DB temporal aislada (`db/smoke.db`) para no entrar en conflicto
 * con el dev server que puede tener `db/nied.db` bloqueada. Marca la primera
 * unidad de `02-ia-ml` y verifica que XP, progreso, racha y el achievement
 * `primer-paso` se actualizaron como esperamos.
 *
 * NO usa el wrapper "use server" — invoca las funciones puras directamente
 * para evitar arrancar el server de Next.
 */

import { existsSync, rmSync } from "node:fs";
import path from "node:path";
// Redirigir la DB a un archivo temporal antes de importar el cliente
process.env.NIED_DB_PATH = path.resolve(process.cwd(), "db", "smoke.db");
import { closeDb, getDb } from "../db/client";
import { getUnit } from "../content/loader";
import { setUnitComplete } from "../db/queries/progress";
import { insertXpEvent, getTotalXp } from "../db/queries/xp";
import { recordActivity, toIsoDate } from "../gamification/streaks";
import { applyMultiplier, XP_RULES } from "../gamification/xp";
import { evaluateAndUnlock } from "../gamification/achievements";
import { isUnlocked } from "../db/queries/achievements";
import { getStreak } from "../db/queries/streaks";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`ok   ${msg}`);
}

async function main() {
  // 1. Limpieza: borra la DB de smoke previa para que el test sea reproducible.
  //    Usa smoke.db (no nied.db) para no interferir con el dev server.
  closeDb();
  const dbPath = path.resolve(process.cwd(), "db", "smoke.db");
  if (existsSync(dbPath)) rmSync(dbPath);
  // WAL/journal sidecars
  for (const sfx of ["-wal", "-shm", "-journal"]) {
    const p = `${dbPath}${sfx}`;
    if (existsSync(p)) rmSync(p);
  }

  // 2. Carga unidad real y verifica content layer.
  const unitCtx = await getUnit("02-ia-ml", "u1");
  assert(unitCtx, "getUnit('02-ia-ml','u1') devuelve la unidad");
  assert(
    unitCtx!.unit.titulo.includes("Fundamentos matemáticos"),
    `título de u1 esperado, recibido: "${unitCtx!.unit.titulo}"`
  );
  assert(unitCtx!.unit.xp_reward === 240, "xp_reward de u1 = 240");
  assert(unitCtx!.html.length > 200, "HTML de u1 renderizado (no vacío)");

  // 3. Replica el pipeline de markUnitComplete (sin "use server" wrapper).
  const db = getDb();
  setUnitComplete(db, "02-ia-ml", "u1");

  const today = toIsoDate(new Date());
  const streak = recordActivity(db, today);
  assert(streak.current_streak === 1, "racha tras primera actividad = 1");
  assert(streak.multiplier === 1.0, "multiplicador inicial = 1.0");

  const baseXp = XP_RULES.unitComplete(unitCtx!.unit);
  const finalXp = applyMultiplier(baseXp, streak.multiplier);
  insertXpEvent(db, {
    activity: "unit-complete",
    trackId: "02-ia-ml",
    unitId: "u1",
    xp: finalXp,
    multiplier: streak.multiplier,
  });

  const total = getTotalXp(db);
  assert(total === 240, `xp_events suma 240 (recibido ${total})`);

  const newly = evaluateAndUnlock(db);
  assert(
    newly.some((a) => a.id === "primer-paso"),
    "logro 'primer-paso' desbloqueado tras la primera unidad"
  );
  assert(isUnlocked(db, "primer-paso"), "isUnlocked('primer-paso') = true");

  const sRow = getStreak(db);
  assert(
    sRow.last_activity_date === today,
    `streaks.last_activity_date = ${today}`
  );

  // 4. Idempotencia: re-ejecutar evaluateAndUnlock no debe duplicar nada.
  const newly2 = evaluateAndUnlock(db);
  assert(
    !newly2.some((a) => a.id === "primer-paso"),
    "evaluateAndUnlock idempotente"
  );

  // 5. Idempotencia de markUnitComplete: dos llamadas seguidas deben
  //    insertar UN solo xp_event y la segunda debe responder
  //    `alreadyComplete: true` con xpAwarded=0.
  //
  //    Usamos una unidad fresca (u2 de 02-ia-ml) para no contaminar el
  //    estado anterior. Importamos la action dinámicamente para evitar
  //    que el wrapper "use server" intente arrancar el server al cargar
  //    el módulo.
  const { markUnitComplete } = await import("../../app/actions/unit");
  const xpCountBefore = (
    db.prepare(`SELECT COUNT(*) AS c FROM xp_events`).get() as { c: number }
  ).c;

  const r1 = await markUnitComplete("02-ia-ml", "u2");
  assert(r1.ok === true, "primer markUnitComplete devuelve ok");
  if (r1.ok) {
    assert(
      !r1.alreadyComplete,
      "primer markUnitComplete NO marca alreadyComplete"
    );
    assert(r1.xpAwarded > 0, "primer markUnitComplete otorga xp > 0");
  }

  const xpCountMid = (
    db.prepare(`SELECT COUNT(*) AS c FROM xp_events`).get() as { c: number }
  ).c;
  assert(
    xpCountMid === xpCountBefore + 1,
    `xp_events incrementó exactamente 1 tras primer markUnitComplete (esperado ${xpCountBefore + 1}, recibido ${xpCountMid})`
  );

  const r2 = await markUnitComplete("02-ia-ml", "u2");
  assert(r2.ok === true, "segundo markUnitComplete devuelve ok");
  if (r2.ok) {
    assert(
      r2.alreadyComplete === true,
      "segundo markUnitComplete devuelve alreadyComplete: true"
    );
    assert(
      r2.xpAwarded === 0,
      `segundo markUnitComplete devuelve xpAwarded=0 (recibido ${r2.xpAwarded})`
    );
  }

  const xpCountAfter = (
    db.prepare(`SELECT COUNT(*) AS c FROM xp_events`).get() as { c: number }
  ).c;
  assert(
    xpCountAfter === xpCountMid,
    `xp_events NO incrementó tras segundo markUnitComplete (esperado ${xpCountMid}, recibido ${xpCountAfter})`
  );

  console.log("\nSMOKE OK — pipeline backend operativo.");
  closeDb();
}

main().catch((err) => {
  console.error("SMOKE ERROR:", err);
  process.exit(1);
});
