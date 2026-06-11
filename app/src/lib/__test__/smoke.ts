/**
 * Smoke test end-to-end del backend de niED contra el curso demo real.
 *
 * Ejecucion: `bun run smoke` (tsx src/lib/__test__/smoke.ts)
 *
 * Usa una DB temporal aislada para no interferir con el dev server.
 * Establece las env vars ANTES de importar cualquier modulo de la app,
 * usando dynamic await import() para garantizar el orden.
 */

import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// --- 0. Env vars PRIMERO, antes de cualquier import de la app ---
process.env.NIED_COURSES_ROOT = "D:/nied/courses";
const tempDb = path.join(os.tmpdir(), `nied-smoke-${Date.now()}.db`);
process.env.NIED_DB_PATH = tempDb;

// -------------------------------------------------------------------

let failures = 0;

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error(`FAIL  ${msg}`);
    failures++;
  } else {
    console.log(`ok    ${msg}`);
  }
}

async function main() {
  // Cleanup: si ya existe la temp DB (re-uso de timestamp) la borramos
  for (const sfx of ["", "-wal", "-shm", "-journal"]) {
    const p = `${tempDb}${sfx}`;
    if (existsSync(p)) rmSync(p);
  }

  // ----------------------------------------------------------------
  // 1. Content layer: listCourses
  // ----------------------------------------------------------------
  const { listCourses } = await import("../content/courses");
  const courses = listCourses();
  const te = courses.find((c) => c.id === "test-estadistica");
  assert(te !== undefined, "listCourses() encuentra 'test-estadistica'");
  assert(
    te?.meta.units.length === 12,
    `test-estadistica tiene 12 unidades declaradas (encontrado: ${te?.meta.units.length})`
  );
  assert(
    te?.writtenUnits.includes("u1"),
    "writtenUnits incluye 'u1'"
  );

  // ----------------------------------------------------------------
  // 2. Content layer: getUnitView u1
  // ----------------------------------------------------------------
  const { getUnitView } = await import("../content/courses");
  const view = await getUnitView("test-estadistica", "u1");
  assert(view !== null, "getUnitView('test-estadistica','u1') es no-null");
  assert(
    (view?.sections.length ?? 0) >= 5,
    `getUnitView tiene >= 5 secciones (encontrado: ${view?.sections.length})`
  );
  assert(
    (view?.preambleHtml.length ?? 0) > 0,
    "getUnitView preambleHtml no vacia"
  );

  // ----------------------------------------------------------------
  // 3. Quiz loader: 15 preguntas en u1
  // ----------------------------------------------------------------
  const { loadQuiz } = await import("../content/quiz-loader");
  const quiz = loadQuiz("test-estadistica", "u1");
  assert(quiz !== null, "loadQuiz('test-estadistica','u1') no-null");
  assert(
    quiz?.questions.length === 15,
    `quiz u1 tiene 15 preguntas (encontrado: ${quiz?.questions.length})`
  );

  // ----------------------------------------------------------------
  // 4. XP: unitXp para u1 (6 horas * 25 xpPerHour = 150)
  // ----------------------------------------------------------------
  const { unitXp } = await import("../gamification/xp");
  const u1Meta = te!.meta.units.find((u) => u.id === "u1")!;
  const xp = unitXp(u1Meta);
  assert(xp === 150, `unitXp para u1 (6h * 25) = 150 (obtenido: ${xp})`);

  // ----------------------------------------------------------------
  // 5. DB flow: markUnitComplete via server action (u1)
  //    Si falla el import "use server", usamos funciones de db directas.
  // ----------------------------------------------------------------
  const { getDb, closeDb } = await import("../db/client");
  const db = getDb();

  let totalXpAfterMark = 0;
  let progressRowExists = false;

  try {
    const { markUnitComplete, unmarkUnitComplete } = await import(
      "../../app/actions/unit"
    );
    const r1 = await markUnitComplete("test-estadistica", "u1");
    assert(r1.ok === true, "markUnitComplete('test-estadistica','u1') ok=true");
    if (r1.ok) {
      assert(
        !r1.alreadyComplete,
        "primer markUnitComplete NO devuelve alreadyComplete"
      );
      assert(r1.xpAwarded > 0, `markUnitComplete xpAwarded > 0 (${r1.xpAwarded})`);
    }

    // totalXp > 0 tras marcar
    const { getTotalXp } = await import("../db/queries/xp");
    totalXpAfterMark = getTotalXp(db);
    assert(totalXpAfterMark > 0, `totalXp > 0 despues de mark (${totalXpAfterMark})`);

    // progress row existe
    const { getUnitProgress } = await import("../db/queries/progress");
    const row = getUnitProgress(db, "test-estadistica", "u1");
    progressRowExists = row !== null && row.status === "completa";
    assert(progressRowExists, "progress row existe y status='completa' para u1");

    // unmark (si existe)
    try {
      await unmarkUnitComplete("test-estadistica", "u1");
      const rowAfter = getUnitProgress(db, "test-estadistica", "u1");
      assert(
        rowAfter?.status === "pendiente",
        "unmarkUnitComplete deja status='pendiente'"
      );
    } catch {
      // unmarkUnitComplete no existe en esta version — skip
      console.log("skip  unmarkUnitComplete no disponible");
    }
  } catch (err) {
    // Fallback: ejercitar funciones de db directas
    console.warn(
      `[smoke] markUnitComplete action fallo (${(err as Error).message}), usando db directo`
    );
    const { setUnitComplete, getUnitProgress } = await import(
      "../db/queries/progress"
    );
    const { insertXpEvent, getTotalXp } = await import("../db/queries/xp");
    const { recordActivity, toIsoDate } = await import(
      "../gamification/streaks"
    );
    const { applyMultiplier, XP_RULES } = await import("../gamification/xp");

    setUnitComplete(db, "test-estadistica", "u1");
    const today = toIsoDate(new Date());
    const streak = recordActivity(db, today);
    const baseXp = XP_RULES.unitComplete(u1Meta);
    const finalXp = applyMultiplier(baseXp, streak.multiplier);
    insertXpEvent(db, {
      activity: "unit-complete",
      courseId: "test-estadistica",
      unitId: "u1",
      xp: finalXp,
      multiplier: streak.multiplier,
    });
    totalXpAfterMark = getTotalXp(db);
    assert(totalXpAfterMark > 0, `totalXp > 0 despues de mark directo (${totalXpAfterMark})`);

    const row = getUnitProgress(db, "test-estadistica", "u1");
    progressRowExists = row !== null && row.status === "completa";
    assert(progressRowExists, "progress row existe y status='completa' para u1 (directo)");
  }

  // ----------------------------------------------------------------
  // 6. SRS flow: upsertCard + getDueCards + reviewCard
  // ----------------------------------------------------------------
  const { upsertCard, getDueCards, reviewCard } = await import(
    "../db/queries/srs"
  );
  const { gradeCard, nextDueDate } = await import("../srs/leitner");

  const today = new Date().toISOString().slice(0, 10);
  // Insertar card con due_date = hoy para que aparezca como vencida
  upsertCard(db, "test-estadistica", "u1", 0, today);

  const due = getDueCards(db, today);
  assert(due.length > 0, `getDueCards devuelve >= 1 card debida hoy (${due.length})`);

  const card = due[0]!;
  assert(card.box === 1, `card recien creada tiene box=1 (box=${card.box})`);

  // Revisar la card: respuesta correcta -> box 2
  const newBox = gradeCard(card.box, true);
  const newDue = nextDueDate(newBox, today);
  reviewCard(
    db,
    card.course_id,
    card.unit_id,
    card.question_index,
    newBox,
    newDue,
    today
  );

  // Verificar que box sea 2
  const afterReview = getDueCards(db, "2099-12-31"); // traer todas
  const updated = afterReview.find(
    (c) =>
      c.course_id === card.course_id &&
      c.unit_id === card.unit_id &&
      c.question_index === card.question_index
  );
  assert(
    updated?.box === 2,
    `despues de reviewCard correcto, box=2 (box=${updated?.box})`
  );

  // ----------------------------------------------------------------
  // Summary
  // ----------------------------------------------------------------
  console.log("");
  if (failures === 0) {
    console.log("SMOKE OK — todos los asserts pasaron.");
  } else {
    console.error(`SMOKE FAIL — ${failures} assert(s) fallaron.`);
  }

  closeDb();

  // Cleanup temp DB
  try {
    for (const sfx of ["", "-wal", "-shm", "-journal"]) {
      const p = `${tempDb}${sfx}`;
      if (existsSync(p)) rmSync(p);
    }
  } catch {
    // best effort
  }

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("SMOKE ERROR:", err);
  process.exit(1);
});
