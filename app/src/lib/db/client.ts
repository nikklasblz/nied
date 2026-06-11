/**
 * Singleton de better-sqlite3 para niED.
 *
 * La ruta de la DB se obtiene de `getConfig().dbPath`, que a su vez lee
 * NIED_DB_PATH del entorno (útil para tests aislados) o usa el default
 * `db/nied.db` relativo al cwd del server.
 *
 * En desarrollo Next.js puede recargar este módulo varias veces (HMR).
 * Almacenamos la instancia en `globalThis` para que sobreviva los reloads.
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { migrate } from "./migrate";
import { getConfig } from "../config";

declare global {
  // eslint-disable-next-line no-var
  var __niedDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (globalThis.__niedDb) return globalThis.__niedDb;
  const dbPath = getConfig().dbPath;
  // Asegurar que la carpeta padre exista
  mkdirSync(path.dirname(dbPath), { recursive: true });
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
