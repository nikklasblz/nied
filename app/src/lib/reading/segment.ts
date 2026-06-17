// src/lib/reading/segment.ts

/** Per-character segmentation of a prose string. */
export interface Segmentation {
  /** word index for each char; whitespace inherits the last started word. */
  wordOf: number[];
  /** sentence index for each char. */
  sentOf: number[];
  wordCount: number;
  sentCount: number;
}

// Lowercase, sin punto. Abreviaturas comunes en español.
const ABBREV = new Set([
  "sr", "sra", "srta", "dr", "dra", "lic", "ing", "etc", "ej",
  "p", "pp", "vol", "fig", "núm", "no", "ud", "uds", "av",
]);

const isSpace = (c: string) => /\s/.test(c);
const isDigit = (c: string) => c >= "0" && c <= "9";
const isWordChar = (c: string) => !isSpace(c) && !/[.,;:!?¿¡()"«»]/.test(c);

/** Tras un punto, ¿es fin de oración real? */
function endsSentence(text: string, i: number): boolean {
  const c = text[i];
  if (c !== "." && c !== "!" && c !== "?") return false;
  if (c === ".") {
    // decimal: dígito . dígito
    if (isDigit(text[i - 1] ?? "") && isDigit(text[i + 1] ?? "")) return false;
    // abreviatura: última palabra antes del punto está en ABBREV
    let j = i - 1;
    let word = "";
    while (j >= 0 && isWordChar(text[j])) {
      word = text[j] + word;
      j--;
    }
    if (ABBREV.has(word.toLowerCase())) return false;
  }
  return true;
}

export function segment(text: string): Segmentation {
  const wordOf: number[] = new Array(text.length);
  const sentOf: number[] = new Array(text.length);
  let wid = -1;
  let sid = 0;
  let prevSpace = true;
  let sentenceJustEnded = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const space = isSpace(c);

    // Una nueva oración empieza en el primer char no-espacio tras un cierre.
    if (sentenceJustEnded && !space) {
      sid++;
      sentenceJustEnded = false;
    }
    if (!space && prevSpace) wid++;
    prevSpace = space;

    wordOf[i] = wid < 0 ? 0 : wid;
    sentOf[i] = sid;

    if (endsSentence(text, i)) sentenceJustEnded = true;
  }

  return {
    wordOf,
    sentOf,
    wordCount: wid + 1,
    sentCount: sid + 1,
  };
}
