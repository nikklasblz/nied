/**
 * Smoke test end-to-end del backend de niED.
 *
 * Ejecución: `bun src/lib/__test__/smoke.ts`
 *
 * Usa una DB temporal aislada (`db/smoke.db`) para no entrar en conflicto
 * con el dev server que puede tener `db/nied.db` bloqueada. Marca la primera
 * unidad de `test-estadistica` y verifica que XP, progreso, racha y el
 * achievement `primer-paso` se actualizaron como esperamos.
 *
 * NO usa el wrapper "use server" — invoca las funciones puras directamente
 * para evitar arrancar el server de Next.
 */

import { existsSync, rmSync } from "node:fs";
import path from "node:path";
// Redirigir la DB a un archivo temporal antes de importar el cliente
process.env.NIED_DB_PATH = path.resolve(process.cwd(), "db", "smoke.db");
import { closeDb, getDb } from "../db/client";
import { getCourse } from "../content/courses";
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
  const courseId = "test-estadistica";
  const course = getCourse(courseId);
  assert(course, `getCourse('${courseId}') devuelve el curso`);
  const unit = course!.meta.units.find((u) => u.id === "u1");
  assert(unit, "u1 declarada en course.yaml");
  assert(unit!.title.length > 0, `título de u1 no vacío: "${unit!.title}"`);

  // 3. Replica el pipeline de markUnitComplete (sin "use server" wrapper).
  const db = getDb();
  setUnitComplete(db, courseId, "u1");

  const today = toIsoDate(new Date());
  const streak = recordActivity(db, today);
  assert(streak.current_streak === 1, "racha tras primera actividad = 1");
  assert(streak.multiplier === 1.0, "multiplicador inicial = 1.0");

  const baseXp = XP_RULES.unitComplete(unit!);
  const finalXp = applyMultiplier(baseXp, streak.multiplier);
  insertXpEvent(db, {
    activity: "unit-complete",
    courseId,
    unitId: "u1",
    xp: finalXp,
    multiplier: streak.multiplier,
  });

  const total = getTotalXp(db);
  assert(total === finalXp, `xp_events suma ${finalXp} (recibido ${total})`);

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
  //    Usamos una unidad fresca (u2) para no contaminar el estado
  //    anterior. Importamos la action dinámicamente para evitar que el
  //    wrapper "use server" intente arrancar el server al cargar el módulo.
  const { markUnitComplete } = await import("../../app/actions/unit");
  const xpCountBefore = (
    db.prepare(`SELECT COUNT(*) AS c FROM xp_events`).get() as { c: number }
  ).c;

  const r1 = await markUnitComplete(courseId, "u2");
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

  const r2 = await markUnitComplete(courseId, "u2");
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
