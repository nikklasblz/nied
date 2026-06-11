/**
 * Carga el archivo de quiz correspondiente a un track y unidad.
 *
 * Convención de nombres: q-{unitId}-*.json dentro de {trackId}/evaluaciones/
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { Quiz } from "./quiz-types";

const CONTENT_ROOT = join(process.cwd(), "..");

export function loadQuiz(trackId: string, unitId: string): Quiz | null {
  // Busca un archivo que empiece con q-{unitId}- en la carpeta evaluaciones del track
  const evalDir = join(CONTENT_ROOT, trackId, "evaluaciones");
  if (!existsSync(evalDir)) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs");
  const files = fs.readdirSync(evalDir) as string[];
  const quizFile = files.find(
    (f: string) => f.startsWith(`q-${unitId}-`) && f.endsWith(".json")
  );
  if (!quizFile) return null;

  try {
    const raw = readFileSync(join(evalDir, quizFile), "utf-8");
    return JSON.parse(raw) as Quiz;
  } catch {
    return null;
  }
}
