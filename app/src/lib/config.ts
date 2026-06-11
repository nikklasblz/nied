import { isAbsolute, resolve } from "node:path";

export interface NiedConfig {
  instanceName: string;
  uiLanguage: "es" | "en";
  coursesRoot: string;
  dbPath: string;
  xpPerHour: number;
}

const DEFAULTS = {
  instanceName: "nied",
  uiLanguage: "es" as const,
  coursesRoot: "../courses",
  dbPath: "db/nied.db",
  xpPerHour: 25,
};

function abs(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

/** Config de instancia. Overrides por env: NIED_INSTANCE_NAME, NIED_UI_LANGUAGE,
 *  NIED_COURSES_ROOT, NIED_DB_PATH, NIED_XP_PER_HOUR. */
export function getConfig(): NiedConfig {
  const xp = Number(process.env.NIED_XP_PER_HOUR ?? DEFAULTS.xpPerHour);
  return {
    instanceName: process.env.NIED_INSTANCE_NAME ?? DEFAULTS.instanceName,
    uiLanguage: process.env.NIED_UI_LANGUAGE === "en" ? "en" : "es",
    coursesRoot: abs(process.env.NIED_COURSES_ROOT ?? DEFAULTS.coursesRoot),
    dbPath: abs(process.env.NIED_DB_PATH ?? DEFAULTS.dbPath),
    xpPerHour: Number.isFinite(xp) && xp > 0 ? xp : DEFAULTS.xpPerHour,
  };
}
