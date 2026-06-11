import { describe, expect, test, afterEach } from "bun:test";
import { t } from "../i18n";

const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe("i18n", () => {
  test("es by default", () => {
    delete process.env.NIED_UI_LANGUAGE;
    expect(t("nav.courses")).toBe("Cursos");
  });
  test("en when configured", () => {
    process.env.NIED_UI_LANGUAGE = "en";
    expect(t("nav.courses")).toBe("Courses");
  });
  test("missing key returns the key", () => {
    expect(t("no.existe.xyz")).toBe("no.existe.xyz");
  });
  test("both locales have identical key sets", async () => {
    const es = (await import("../i18n/es.json")).default as Record<string, string>;
    const en = (await import("../i18n/en.json")).default as Record<string, string>;
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });
});
