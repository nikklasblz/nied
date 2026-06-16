import { describe, expect, test } from "bun:test";
import { segment } from "../reading/segment";

describe("segment", () => {
  test("counts words and one sentence", () => {
    const s = segment("Hola mundo.");
    expect(s.wordCount).toBe(2);
    expect(s.sentCount).toBe(1);
    expect(s.wordOf.length).toBe("Hola mundo.".length);
    expect(s.sentOf.length).toBe("Hola mundo.".length);
  });
  test("does not split on abbreviations", () => {
    const s = segment("El Dr. López llegó. Se fue.");
    expect(s.sentCount).toBe(2);
  });
  test("does not split inside decimals", () => {
    const s = segment("Pi es 3.14 aprox y vale.");
    expect(s.sentCount).toBe(1);
  });
  test("splits on ! and ?", () => {
    const s = segment("¿Vienes? ¡Sí! Vamos.");
    expect(s.sentCount).toBe(3);
  });
  test("whitespace inherits current word index", () => {
    const s = segment("ab cd");
    // indices: a0 b0 (space)0 c1 d1
    expect(s.wordOf).toEqual([0, 0, 0, 1, 1]);
  });
});
