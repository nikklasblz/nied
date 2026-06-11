import { describe, expect, test, afterEach } from "bun:test";
import { getConfig } from "../config";

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe("getConfig", () => {
  test("defaults: es, xp 25, instance nied", () => {
    delete process.env.NIED_UI_LANGUAGE;
    delete process.env.NIED_XP_PER_HOUR;
    delete process.env.NIED_INSTANCE_NAME;
    const c = getConfig();
    expect(c.uiLanguage).toBe("es");
    expect(c.xpPerHour).toBe(25);
    expect(c.instanceName).toBe("nied");
  });

  test("env overrides", () => {
    process.env.NIED_UI_LANGUAGE = "en";
    process.env.NIED_XP_PER_HOUR = "10";
    process.env.NIED_INSTANCE_NAME = "mi-espacio";
    const c = getConfig();
    expect(c.uiLanguage).toBe("en");
    expect(c.xpPerHour).toBe(10);
    expect(c.instanceName).toBe("mi-espacio");
  });

  test("invalid language falls back to es", () => {
    process.env.NIED_UI_LANGUAGE = "fr";
    expect(getConfig().uiLanguage).toBe("es");
  });

  test("invalid xp falls back to 25", () => {
    process.env.NIED_XP_PER_HOUR = "-3";
    expect(getConfig().xpPerHour).toBe(25);
  });

  test("coursesRoot and dbPath are absolute", () => {
    delete process.env.NIED_COURSES_ROOT;
    delete process.env.NIED_DB_PATH;
    const c = getConfig();
    expect(/^([A-Za-z]:\\|\/)/.test(c.coursesRoot)).toBe(true);
    expect(/^([A-Za-z]:\\|\/)/.test(c.dbPath)).toBe(true);
  });
});
