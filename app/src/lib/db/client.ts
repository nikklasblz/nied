/**
 * Singleton de better-sqlite3 para niED.
 *
 * El archivo vive en `D:\niED\app\db\nied.db`. La carpeta `db/` está
 * gitignored — los datos del usuario no van al repo.
 *
 * En desarrollo Next.js puede recargar este módulo varias veces (HMR).
 * Almacenamos la instancia en `globalThis` para que sobreviva los reloads.
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { migrate } from "./migrate";

declare global {
  // eslint-disable-next-line no-var
  var __niedDb: Database.Database | undefined;
}

function resolveDbPath(): string {
  // NIED_DB_PATH permite sobreescribir la ruta — útil para tests aislados
  // que no deben competir con el dev server por el lock de nied.db.
  if (process.env.NIED_DB_PATH) return process.env.NIED_DB_PATH;
  // En este proyecto el server siempre corre dentro de `<NIED_ROOT>/app/`,
  // así que cwd al arrancar es esa carpeta. La DB vive como hermana de `src/`.
  const dbDir = path.resolve(process.cwd(), "db");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, "nied.db");
}

export function getDb(): Database.Database {
  if (globalThis.__niedDb) return globalThis.__niedDb;
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  migrate(db);
  globalThis.__niedDb = db;
  return db;
}

/** Cierra la conexión. Útil para tests/smoke. */
export function closeDb(): void {
  if (globalThis.__niedDb) {
    globalThis.__niedDb.close();
    globalThis.__niedDb = undefined;
  }
}
