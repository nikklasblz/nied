# Reading Experience Pacer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional reading pacer to the nied app that highlights prose at an adjustable pace, fix the wasted right-side whitespace by centering the reading column, and persist reading preferences (also editable in Settings).

**Architecture:** Pure, unit-tested core for text segmentation (`segment.ts`) and preferences (`prefs.ts`). A thin client layer wraps the server-rendered `<article>`: `tokenize-dom.ts` walks the DOM and wraps prose characters in spans (skipping math/tables/code), and `ReadingPacer` runs a `requestAnimationFrame` engine that maps reading progress to the active letter/word/sentence. Controls are a presentational `ReadingControls` form reused by both a floating reader menu and the Settings page. Prefs persist in `localStorage` under `nied-reading`.

**Tech Stack:** Next.js 16 (App Router, server + client components), React 19, TypeScript, Tailwind v4 (tokens in `@theme inline`), `bun:test`, Playwright (MCP) for smoke.

**Conventions to follow:**
- i18n is server-side (`t()`); client components receive `labels` via props (see `app-shell.tsx`).
- Tests live in `src/lib/__test__/*.test.ts`, run with `bun test src/lib/__test__`.
- Typecheck with `bunx tsc --noEmit` from `D:\nied\app`.
- All UI strings in Spanish/English via i18n; code in English.
- Work on branch `feat/reading-pacer` (already created). Commit after every task.

---

## File Structure

**New:**
- `src/lib/reading/segment.ts` — pure sentence/word segmentation of a string.
- `src/lib/reading/prefs.ts` — `ReadingPrefs` type, defaults, `coercePrefs()`.
- `src/lib/reading/tokenize-dom.ts` — DOM walker that wraps prose chars in spans.
- `src/lib/reading/use-reading-prefs.ts` — client hook over `localStorage`.
- `src/components/reading-controls.tsx` — presentational preference fields (client).
- `src/components/reading-pacer.tsx` — engine + floating menu wrapper (client).
- `src/components/reading-settings.tsx` — Settings-page wrapper around `ReadingControls` (client).
- `src/lib/__test__/segment.test.ts`, `src/lib/__test__/reading-prefs.test.ts`.

**Modified:**
- `src/app/globals.css` — pacer CSS variables + highlight classes.
- `src/app/courses/[id]/[unit]/[section]/page.tsx` — center column, wrap article in pacer.
- `src/app/courses/[id]/[unit]/page.tsx` — center column (preamble).
- `src/app/ajustes/page.tsx` — real "Lectura" settings.
- `src/lib/i18n/es.json`, `src/lib/i18n/en.json` — new keys; remove `settings.placeholder`.

**Deleted:**
- `src/components/unit-toc.tsx` — dead code (never imported).

---

## Task 1: Text segmentation core (pure)

**Files:**
- Create: `src/lib/reading/segment.ts`
- Test: `src/lib/__test__/segment.test.ts`

Segmentation maps every character of a string to a word index and a sentence index. Whitespace inherits the current (last-started) word. Sentence boundaries occur after `.`, `!`, `?` **except** after known abbreviations and inside decimals (digit-dot-digit).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__test__/segment.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/nied/app && bun test src/lib/__test__/segment.test.ts`
Expected: FAIL — `Cannot find module '../reading/segment'`.

- [ ] **Step 3: Write the implementation**

```ts
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
  "p", "pp", "vol", "fig", "núm", "no", "ud", "uds", "av", " av",
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/nied/app && bun test src/lib/__test__/segment.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add app/src/lib/reading/segment.ts app/src/lib/__test__/segment.test.ts && git commit -m "feat(reading): pure text segmentation (word/sentence) core"
```

---

## Task 2: Reading preferences (pure)

**Files:**
- Create: `src/lib/reading/prefs.ts`
- Test: `src/lib/__test__/reading-prefs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__test__/reading-prefs.test.ts
import { describe, expect, test } from "bun:test";
import { coercePrefs, DEFAULT_PREFS } from "../reading/prefs";

describe("coercePrefs", () => {
  test("returns defaults for null/garbage", () => {
    expect(coercePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(coercePrefs("nope")).toEqual(DEFAULT_PREFS);
    expect(coercePrefs(42)).toEqual(DEFAULT_PREFS);
  });
  test("merges partial objects over defaults", () => {
    const p = coercePrefs({ wpm: 300, granularity: "word" });
    expect(p.wpm).toBe(300);
    expect(p.granularity).toBe("word");
    expect(p.style).toBe(DEFAULT_PREFS.style);
  });
  test("clamps wpm to [140,500]", () => {
    expect(coercePrefs({ wpm: 9999 }).wpm).toBe(500);
    expect(coercePrefs({ wpm: 10 }).wpm).toBe(140);
    expect(coercePrefs({ wpm: "x" }).wpm).toBe(DEFAULT_PREFS.wpm);
  });
  test("rejects invalid enum values", () => {
    expect(coercePrefs({ granularity: "paragraph" }).granularity).toBe(DEFAULT_PREFS.granularity);
    expect(coercePrefs({ style: "rainbow" }).style).toBe(DEFAULT_PREFS.style);
  });
  test("rejects non-hex colors", () => {
    expect(coercePrefs({ accent: "red" }).accent).toBe(DEFAULT_PREFS.accent);
    expect(coercePrefs({ accent: "#abc123" }).accent).toBe("#abc123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/nied/app && bun test src/lib/__test__/reading-prefs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/reading/prefs.ts

export type Granularity = "letter" | "word" | "sentence";
export type HighlightStyle = "container" | "line" | "glow";

export interface ReadingPrefs {
  /** Pacer feature active (controls + keyboard ready). Off = plain text. */
  enabled: boolean;
  granularity: Granularity;
  style: HighlightStyle;
  /** hex color for container/glow styles. */
  accent: string;
  /** hex color for the advancing-line style. */
  line: string;
  /** words per minute. */
  wpm: number;
}

export const READING_PREFS_KEY = "nied-reading";
export const WPM_MIN = 140;
export const WPM_MAX = 500;

export const DEFAULT_PREFS: ReadingPrefs = {
  enabled: true,
  granularity: "sentence",
  style: "container",
  accent: "#14b8a6", // matches --accent-primary (teal)
  line: "#d23232",
  wpm: 260,
};

const GRANS: Granularity[] = ["letter", "word", "sentence"];
const STYLES: HighlightStyle[] = ["container", "line", "glow"];
const HEX = /^#[0-9a-fA-F]{6}$/;

function clampWpm(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULT_PREFS.wpm;
  return Math.min(WPM_MAX, Math.max(WPM_MIN, Math.round(v)));
}

/** Validate + merge any stored/parsed value over defaults. Never throws. */
export function coercePrefs(raw: unknown): ReadingPrefs {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_PREFS };
  const r = raw as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : DEFAULT_PREFS.enabled,
    granularity: GRANS.includes(r.granularity as Granularity)
      ? (r.granularity as Granularity)
      : DEFAULT_PREFS.granularity,
    style: STYLES.includes(r.style as HighlightStyle)
      ? (r.style as HighlightStyle)
      : DEFAULT_PREFS.style,
    accent: typeof r.accent === "string" && HEX.test(r.accent) ? r.accent : DEFAULT_PREFS.accent,
    line: typeof r.line === "string" && HEX.test(r.line) ? r.line : DEFAULT_PREFS.line,
    wpm: clampWpm(r.wpm),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/nied/app && bun test src/lib/__test__/reading-prefs.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add app/src/lib/reading/prefs.ts app/src/lib/__test__/reading-prefs.test.ts && git commit -m "feat(reading): preferences type + coercion"
```

---

## Task 3: i18n keys + parity

**Files:**
- Modify: `src/lib/i18n/es.json`, `src/lib/i18n/en.json`

Add reading keys; remove the now-unused `settings.placeholder` from both locales (keep `common.availableV05` — still used by `bitacora`). The existing parity test (`i18n.test.ts`) enforces identical key sets.

- [ ] **Step 1: Add keys to `es.json`** (insert near the `settings.*` group; remove the `settings.placeholder` line)

```json
  "settings.readingTitle": "Lectura",
  "settings.readingDesc": "Configura el guía de lectura (pacer): se ilumina el texto al ritmo que elijas para sostener la atención. Es opcional.",
  "reading.menu": "Opciones de lectura",
  "reading.enable": "Guía de lectura",
  "reading.play": "Reproducir",
  "reading.pause": "Pausar",
  "reading.restart": "Reiniciar",
  "reading.granularity": "Granularidad",
  "reading.gran.letter": "Letra",
  "reading.gran.word": "Palabra",
  "reading.gran.sentence": "Oración",
  "reading.style": "Estilo",
  "reading.style.container": "Contenedor",
  "reading.style.line": "Línea",
  "reading.style.glow": "Glow",
  "reading.color": "Color",
  "reading.colorAccent": "Resaltado",
  "reading.colorLine": "Línea",
  "reading.speed": "Velocidad",
  "reading.speedUnit": "ppm",
  "reading.notAvailable": "Esta lección no tiene prosa para guiar."
```

- [ ] **Step 2: Add the same keys to `en.json`** (remove its `settings.placeholder` line too)

```json
  "settings.readingTitle": "Reading",
  "settings.readingDesc": "Configure the reading guide (pacer): text lights up at your chosen pace to hold attention. It is optional.",
  "reading.menu": "Reading options",
  "reading.enable": "Reading guide",
  "reading.play": "Play",
  "reading.pause": "Pause",
  "reading.restart": "Restart",
  "reading.granularity": "Granularity",
  "reading.gran.letter": "Letter",
  "reading.gran.word": "Word",
  "reading.gran.sentence": "Sentence",
  "reading.style": "Style",
  "reading.style.container": "Container",
  "reading.style.line": "Line",
  "reading.style.glow": "Glow",
  "reading.color": "Color",
  "reading.colorAccent": "Highlight",
  "reading.colorLine": "Line",
  "reading.speed": "Speed",
  "reading.speedUnit": "wpm",
  "reading.notAvailable": "This lesson has no prose to guide."
```

- [ ] **Step 3: Run the parity + i18n tests**

Run: `cd /d/nied/app && bun test src/lib/__test__/i18n.test.ts`
Expected: PASS — including "both locales have identical key sets". If it fails, a key is missing or misspelled in one locale.

- [ ] **Step 4: Commit**

```bash
cd /d/nied && git add app/src/lib/i18n/es.json app/src/lib/i18n/en.json && git commit -m "i18n(reading): add reading + settings keys, drop settings.placeholder"
```

---

## Task 4: Pacer styles in globals.css

**Files:**
- Modify: `src/app/globals.css`

Add highlight classes scoped under `.pacer` (the wrapper class `ReadingPacer` puts on the article). Colors come from `--pacer-accent` / `--pacer-line` set inline on the wrapper, mixed with `color-mix()` so both light and dark themes work.

- [ ] **Step 1: Append the pacer block** to the end of `globals.css` (after the heatmap block, inside no `@layer` — top level is fine; match the file's existing plain-CSS style)

```css
/* Reading pacer — highlight states applied to per-char spans by ReadingPacer.
   Colors come from --pacer-accent / --pacer-line set inline on .pacer. */
.pacer .pc {
  border-radius: 3px;
}
.pacer .pc.unread {
  opacity: 0.3;
}
.pacer .pc.read {
  opacity: 1;
}
/* container style */
.pacer .pc.glow-trail {
  background: color-mix(in srgb, var(--pacer-accent) 16%, transparent);
}
.pacer .pc.box {
  background: var(--pacer-accent);
  color: #fff;
  border-radius: 4px;
}
.pacer .pc.block {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--pacer-accent) 24%, transparent),
    color-mix(in srgb, var(--pacer-accent) 7%, transparent)
  );
}
/* advancing-line style */
.pacer .pc.ul {
  box-shadow: inset 0 -0.13em 0 color-mix(in srgb, var(--pacer-line) 55%, transparent);
}
.pacer .pc.ulhead {
  box-shadow: inset 0 -0.16em 0 var(--pacer-line);
}
/* glow style */
.pacer .pc.lit {
  color: var(--pacer-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--pacer-accent) 72%, transparent);
  font-weight: 600;
}
.pacer .pc.littrail {
  color: color-mix(in srgb, var(--pacer-accent) 60%, currentColor);
}
@media (prefers-reduced-motion: reduce) {
  .pacer .pc {
    transition: none !important;
  }
}
```

- [ ] **Step 2: Verify the dev server compiles the CSS**

The dev server is running on `localhost:3000`. Run:
`cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors (CSS isn't typechecked, but this confirms the workspace still typechecks). Visual verification happens in Task 12.

- [ ] **Step 3: Commit**

```bash
cd /d/nied && git add app/src/app/globals.css && git commit -m "style(reading): pacer highlight classes (theme-aware via color-mix)"
```

---

## Task 5: Center reading column + delete dead unit-toc

**Files:**
- Delete: `src/components/unit-toc.tsx`
- Modify: `src/app/courses/[id]/[unit]/[section]/page.tsx:40`
- Modify: `src/app/courses/[id]/[unit]/page.tsx:60`

The reading column currently uses `max-w-dashboard` (wide) which leaves a dead right gutter because `prose-niED` is narrower and left-aligned. Switch the reading containers to the existing `max-w-reading` token, centered with `mx-auto`.

- [ ] **Step 1: Confirm `unit-toc.tsx` is unused**

Run: `cd /d/nied/app && grep -rn "unit-toc\|UnitToc" src` 
Expected: matches ONLY inside `src/components/unit-toc.tsx` itself. If any other file imports it, stop and report.

- [ ] **Step 2: Delete the dead component**

```bash
cd /d/nied && git rm app/src/components/unit-toc.tsx
```

- [ ] **Step 3: Center the section reading column**

In `src/app/courses/[id]/[unit]/[section]/page.tsx`, change line 40 from:

```tsx
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
```

to:

```tsx
    <div className="mx-auto flex w-full max-w-reading flex-col gap-6 px-4 py-8 md:px-6">
```

- [ ] **Step 4: Center the unit page column**

In `src/app/courses/[id]/[unit]/page.tsx`, change line 60 from `max-w-dashboard` to `max-w-reading` (same edit as Step 3).

- [ ] **Step 5: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors (removing unit-toc breaks nothing since it was unused).

- [ ] **Step 6: Commit**

```bash
cd /d/nied && git add -A app/src/app/courses app/src/components/unit-toc.tsx && git commit -m "feat(reading): center reading column, remove dead unit-toc"
```

---

## Task 6: useReadingPrefs hook (client)

**Files:**
- Create: `src/lib/reading/use-reading-prefs.ts`

Client hook: loads from `localStorage` on mount (SSR-safe — starts from defaults, hydrates in effect), persists on change. On first load with no stored value, honors `prefers-reduced-motion` by starting disabled.

- [ ] **Step 1: Write the hook**

```ts
// src/lib/reading/use-reading-prefs.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  coercePrefs,
  DEFAULT_PREFS,
  READING_PREFS_KEY,
  type ReadingPrefs,
} from "./prefs";

/**
 * Reading prefs persisted in localStorage. SSR-safe: returns DEFAULT_PREFS on
 * the server and during the first client render, then hydrates from storage in
 * an effect to avoid hydration mismatch.
 */
export function useReadingPrefs(): {
  prefs: ReadingPrefs;
  hydrated: boolean;
  update: (patch: Partial<ReadingPrefs>) => void;
} {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let next: ReadingPrefs;
    try {
      const raw = localStorage.getItem(READING_PREFS_KEY);
      if (raw === null) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        next = { ...DEFAULT_PREFS, enabled: reduced ? false : DEFAULT_PREFS.enabled };
      } else {
        next = coercePrefs(JSON.parse(raw));
      }
    } catch {
      next = { ...DEFAULT_PREFS };
    }
    setPrefs(next);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<ReadingPrefs>) => {
    setPrefs((prev) => {
      const merged = coercePrefs({ ...prev, ...patch });
      try {
        localStorage.setItem(READING_PREFS_KEY, JSON.stringify(merged));
      } catch {
        /* storage unavailable — keep in-memory only */
      }
      return merged;
    });
  }, []);

  return { prefs, hydrated, update };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /d/nied && git add app/src/lib/reading/use-reading-prefs.ts && git commit -m "feat(reading): useReadingPrefs localStorage hook"
```

---

## Task 7: ReadingControls (presentational, client)

**Files:**
- Create: `src/components/reading-controls.tsx`

Pure presentational form for the preference fields (no Play/Pause — that's reader-only). Reused by the floating reader menu and the Settings page. All strings via `labels` prop.

- [ ] **Step 1: Write the component**

```tsx
// src/components/reading-controls.tsx
"use client";

import {
  WPM_MIN,
  WPM_MAX,
  type Granularity,
  type HighlightStyle,
  type ReadingPrefs,
} from "@/lib/reading/prefs";

export type ReadingControlsLabels = {
  enable: string;
  granularity: string;
  granLetter: string;
  granWord: string;
  granSentence: string;
  style: string;
  styleContainer: string;
  styleLine: string;
  styleGlow: string;
  color: string;
  colorAccent: string;
  colorLine: string;
  speed: string;
  speedUnit: string;
};

const PRESETS = ["#14b8a6", "#2563eb", "#7c3aed", "#d97706", "#db2777"];

export function ReadingControls({
  prefs,
  onChange,
  labels,
}: {
  prefs: ReadingPrefs;
  onChange: (patch: Partial<ReadingPrefs>) => void;
  labels: ReadingControlsLabels;
}) {
  const gran: [Granularity, string][] = [
    ["letter", labels.granLetter],
    ["word", labels.granWord],
    ["sentence", labels.granSentence],
  ];
  const styles: [HighlightStyle, string][] = [
    ["container", labels.styleContainer],
    ["line", labels.styleLine],
    ["glow", labels.styleGlow],
  ];

  return (
    <div className="flex flex-col gap-4 text-sm">
      {/* enable */}
      <label className="flex items-center justify-between gap-3">
        <span className="font-medium text-fg-primary">{labels.enable}</span>
        <input
          type="checkbox"
          checked={prefs.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="size-4 accent-accent-primary"
        />
      </label>

      {/* granularity */}
      <Segmented
        legend={labels.granularity}
        options={gran}
        value={prefs.granularity}
        onChange={(v) => onChange({ granularity: v })}
      />

      {/* style */}
      <Segmented
        legend={labels.style}
        options={styles}
        value={prefs.style}
        onChange={(v) => onChange({ style: v })}
      />

      {/* color */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
          {labels.color}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-fg-secondary">
            {labels.colorAccent}
            <input
              type="color"
              value={prefs.accent}
              onChange={(e) => onChange({ accent: e.target.value })}
              className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-fg-secondary">
            {labels.colorLine}
            <input
              type="color"
              value={prefs.line}
              onChange={(e) => onChange({ line: e.target.value })}
              className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
          </label>
          <div className="flex items-center gap-1.5">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => onChange({ accent: c })}
                className="size-5 rounded-full border-2 border-border"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* speed */}
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
          {labels.speed}{" "}
          <span className="text-accent-primary">
            {prefs.wpm} {labels.speedUnit}
          </span>
        </span>
        <input
          type="range"
          min={WPM_MIN}
          max={WPM_MAX}
          step={20}
          value={prefs.wpm}
          onChange={(e) => onChange({ wpm: Number(e.target.value) })}
          className="accent-accent-primary"
        />
      </label>
    </div>
  );
}

function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        {legend}
      </span>
      <div className="inline-flex overflow-hidden rounded-lg border border-border">
        {options.map(([v, label], i) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              i > 0 ? "border-l border-border" : ""
            } ${
              value === v
                ? "bg-accent-primary text-white"
                : "text-fg-secondary hover:text-fg-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /d/nied && git add app/src/components/reading-controls.tsx && git commit -m "feat(reading): ReadingControls presentational form"
```

---

## Task 8: DOM tokenizer

**Files:**
- Create: `src/lib/reading/tokenize-dom.ts`

Walks a rendered article element and wraps prose characters in `<span class="pc">`, skipping code/math/tables/figures. Builds parallel `charWord` / `charSent` arrays (continuous across blocks) using `segment()`. Block changes force a new word + sentence so paragraphs don't bleed together.

- [ ] **Step 1: Write the tokenizer**

```ts
// src/lib/reading/tokenize-dom.ts
import { segment } from "./segment";

export interface Tokenized {
  chars: HTMLElement[];
  charWord: number[];
  charSent: number[];
  total: number;
}

// Containers whose text must NOT be paced (kept intact + selectable).
const OMIT_SELECTOR =
  "pre, code, table, figure, img, svg, .katex, .katex-display, .mermaid";

/** Nearest block-level ancestor used to detect paragraph boundaries. */
function blockOf(node: Node, root: Element): Element | null {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  while (el && el !== root) {
    if (/^(P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE)$/.test(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Wrap pacable text in spans. Mutates the DOM under `root`. Idempotent guard:
 * if already tokenized (a `.pc` exists), returns the existing spans.
 */
export function tokenizeArticle(root: HTMLElement): Tokenized {
  const existing = root.querySelectorAll<HTMLElement>("span.pc");
  if (existing.length > 0) {
    const chars = Array.from(existing);
    return {
      chars,
      charWord: chars.map((c) => Number(c.dataset.w)),
      charSent: chars.map((c) => Number(c.dataset.s)),
      total: chars.length,
    };
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue ?? "";
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(OMIT_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    textNodes.push(n as Text);
  }

  const chars: HTMLElement[] = [];
  const charWord: number[] = [];
  const charSent: number[] = [];
  let widBase = 0;
  let sidBase = 0;
  let prevBlock: Element | null = null;

  for (const textNode of textNodes) {
    const block = blockOf(textNode, root);
    if (prevBlock !== null && block !== prevBlock) {
      // new paragraph: advance counters so segments don't merge
      widBase = (charWord[charWord.length - 1] ?? -1) + 1;
      sidBase = (charSent[charSent.length - 1] ?? -1) + 1;
    }
    prevBlock = block;

    const text = textNode.nodeValue ?? "";
    const seg = segment(text);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement("span");
      span.className = "pc";
      span.textContent = text[i];
      const w = widBase + seg.wordOf[i];
      const s = sidBase + seg.sentOf[i];
      span.dataset.w = String(w);
      span.dataset.s = String(s);
      frag.appendChild(span);
      chars.push(span);
      charWord.push(w);
      charSent.push(s);
    }
    textNode.replaceWith(frag);
  }

  return { chars, charWord, charSent, total: chars.length };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors. (Behavior is verified in the Playwright smoke, Task 12 — DOM logic needs a real browser.)

- [ ] **Step 3: Commit**

```bash
cd /d/nied && git add app/src/lib/reading/tokenize-dom.ts && git commit -m "feat(reading): DOM tokenizer wraps prose chars, skips math/tables/code"
```

---

## Task 9: ReadingPacer (engine + floating menu, client)

**Files:**
- Create: `src/components/reading-pacer.tsx`

Wraps `children` (the article) in a `.pacer` div, tokenizes on mount, runs the rAF engine, renders highlight classes per granularity+style, wires keyboard shortcuts, and provides a floating collapsible menu (Play/Pause + `ReadingControls`).

- [ ] **Step 1: Write the component**

```tsx
// src/components/reading-pacer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { tokenizeArticle, type Tokenized } from "@/lib/reading/tokenize-dom";
import { useReadingPrefs } from "@/lib/reading/use-reading-prefs";
import type { ReadingPrefs } from "@/lib/reading/prefs";
import { ReadingControls, type ReadingControlsLabels } from "@/components/reading-controls";
import { Play, Pause, BookOpen } from "@/components/icons";

export type ReadingPacerLabels = ReadingControlsLabels & {
  menu: string;
  play: string;
  pause: string;
  notAvailable: string;
};

const CHARS_PER_WORD = 5.6;

export function ReadingPacer({
  labels,
  children,
}: {
  labels: ReadingPacerLabels;
  children: React.ReactNode;
}) {
  const articleRef = useRef<HTMLDivElement>(null);
  const tok = useRef<Tokenized | null>(null);
  const rafRef = useRef<number | null>(null);
  const readChars = useRef(0);
  const lastTs = useRef(0);
  const prefsRef = useRef<ReadingPrefs | null>(null);

  const { prefs, hydrated, update } = useReadingPrefs();
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pacable, setPacable] = useState(true);
  const pathname = usePathname();

  prefsRef.current = prefs;

  // Tokenize on mount / route change.
  useEffect(() => {
    if (!articleRef.current) return;
    setPlaying(false);
    readChars.current = 0;
    const t = tokenizeArticle(articleRef.current);
    tok.current = t;
    setPacable(t.total > 0);
    renderFocus(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Apply color vars whenever they change.
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    el.style.setProperty("--pacer-accent", prefs.accent);
    el.style.setProperty("--pacer-line", prefs.line);
  }, [prefs.accent, prefs.line]);

  // Re-render styling when granularity/style/enabled changes.
  useEffect(() => {
    if (!tok.current) return;
    if (!prefs.enabled) {
      renderFocus(-2); // plain
    } else {
      renderFocus(playing || readChars.current > 0 ? Math.floor(readChars.current) : -1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.enabled, prefs.granularity, prefs.style]);

  const renderFocus = useCallback((focus: number) => {
    const t = tok.current;
    const p = prefsRef.current;
    if (!t || !p) return;
    // focus === -2 → plain (Off); focus === -1 → idle (enabled, not started)
    const plain = focus === -2 || (focus === -1 && true);
    const fw = focus >= 0 ? t.charWord[Math.min(focus, t.total - 1)] : -1;
    const fs = focus >= 0 ? t.charSent[Math.min(focus, t.total - 1)] : -1;
    for (let i = 0; i < t.total; i++) {
      const span = t.chars[i];
      if (plain) {
        span.className = "pc";
        continue;
      }
      let cls = "pc" + (i > focus ? " unread" : " read");
      const inUnit =
        p.granularity === "letter"
          ? i === focus
          : p.granularity === "word"
            ? t.charWord[i] === fw
            : t.charSent[i] === fs;
      if (p.style === "container") {
        if (p.granularity === "letter") {
          if (i === focus) cls += " box";
          else if (i < focus && focus - i < 7) cls += " glow-trail";
        } else if (inUnit) cls += " block";
      } else if (p.style === "line") {
        if (i <= focus) cls += " ul";
        if (i === focus) cls += " ulhead";
      } else {
        if (inUnit) cls += " lit";
        else if (p.granularity === "letter" && i < focus && focus - i < 5) cls += " littrail";
      }
      span.className = cls;
    }
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const tick = useCallback(
    (ts: number) => {
      const t = tok.current;
      const p = prefsRef.current;
      if (!t || !p) return;
      if (lastTs.current === 0) lastTs.current = ts;
      const dt = (ts - lastTs.current) / 1000;
      lastTs.current = ts;
      const cps = (p.wpm / 60) * CHARS_PER_WORD;
      readChars.current += dt * cps;
      const focus = Math.floor(readChars.current);
      if (focus >= t.total) {
        renderFocus(t.total - 1);
        setPlaying(false);
        return;
      }
      renderFocus(focus);
      rafRef.current = requestAnimationFrame(tick);
    },
    [renderFocus]
  );

  const play = useCallback(() => {
    if (!tok.current || tok.current.total === 0) return;
    if (readChars.current >= tok.current.total) readChars.current = 0;
    lastTs.current = 0;
    setPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    stop();
    setPlaying(false);
  }, [stop]);

  const togglePlay = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, play, pause]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const t = tok.current;
      const p = prefsRef.current;
      if (!t || !p) return;
      const cur = Math.max(0, Math.floor(readChars.current));
      // jump to next/prev sentence boundary for a meaningful step
      const arr = p.granularity === "sentence" ? t.charSent : t.charWord;
      const curUnit = arr[Math.min(cur, t.total - 1)] ?? 0;
      const target = curUnit + dir;
      let idx = t.total - 1;
      for (let i = 0; i < t.total; i++) {
        if (arr[i] === target) { idx = i; break; }
      }
      if (target < 0) { readChars.current = 0; renderFocus(-1); return; }
      readChars.current = idx;
      renderFocus(idx);
    },
    [renderFocus]
  );

  // Keyboard shortcuts (only when enabled + pacable).
  useEffect(() => {
    if (!prefs.enabled || !pacable) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      else if (e.key === "+" || e.key === "=") update({ wpm: prefs.wpm + 20 });
      else if (e.key === "-") update({ wpm: prefs.wpm - 20 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs.enabled, prefs.wpm, pacable, togglePlay, step, update]);

  // Cleanup rAF on unmount.
  useEffect(() => stop, [stop]);

  return (
    <div className="relative">
      <div ref={articleRef} className={prefs.enabled ? "pacer" : undefined}>
        {children}
      </div>

      {/* Floating reader menu */}
      {hydrated && pacable && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          {menuOpen && (
            <div className="mb-2 w-72 rounded-xl border border-border bg-bg-elevated p-4 shadow-lg">
              <ReadingControls prefs={prefs} onChange={update} labels={labels} />
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated px-2 py-1.5 shadow-lg">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!prefs.enabled}
              aria-label={playing ? labels.pause : labels.play}
              className="grid size-9 place-items-center rounded-full bg-accent-primary text-white disabled:opacity-40"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={labels.menu}
              className="grid size-9 place-items-center rounded-full text-fg-secondary hover:text-fg-primary"
            >
              <BookOpen className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the icons exist**

Run: `cd /d/nied/app && grep -n "Play\|Pause\|BookOpen" src/components/icons.tsx`
Expected: all three are exported. If any is missing, add it to `icons.tsx` following the existing export pattern (re-export from `lucide-react`), then re-run.

- [ ] **Step 3: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /d/nied && git add app/src/components/reading-pacer.tsx app/src/components/icons.tsx && git commit -m "feat(reading): ReadingPacer engine + floating menu + keyboard"
```

---

## Task 10: Integrate ReadingPacer into the section page

**Files:**
- Modify: `src/app/courses/[id]/[unit]/[section]/page.tsx`

Compute labels server-side with `t()` and wrap the `<article>` in `<ReadingPacer>`.

- [ ] **Step 1: Add imports** at the top of the section page (after existing imports)

```tsx
import { ReadingPacer, type ReadingPacerLabels } from "@/components/reading-pacer";
```

- [ ] **Step 2: Build the labels object** inside the component, before `return`

```tsx
  const pacerLabels: ReadingPacerLabels = {
    menu: t("reading.menu"),
    play: t("reading.play"),
    pause: t("reading.pause"),
    notAvailable: t("reading.notAvailable"),
    enable: t("reading.enable"),
    granularity: t("reading.granularity"),
    granLetter: t("reading.gran.letter"),
    granWord: t("reading.gran.word"),
    granSentence: t("reading.gran.sentence"),
    style: t("reading.style"),
    styleContainer: t("reading.style.container"),
    styleLine: t("reading.style.line"),
    styleGlow: t("reading.style.glow"),
    color: t("reading.color"),
    colorAccent: t("reading.colorAccent"),
    colorLine: t("reading.colorLine"),
    speed: t("reading.speed"),
    speedUnit: t("reading.speedUnit"),
  };
```

- [ ] **Step 3: Wrap the article**. Replace the existing article block:

```tsx
      {/* Contenido de la sección */}
      <article
        className="prose-niED"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />
```

with:

```tsx
      {/* Contenido de la sección */}
      <ReadingPacer labels={pacerLabels}>
        <article
          className="prose-niED"
          dangerouslySetInnerHTML={{ __html: section.html }}
        />
      </ReadingPacer>
```

- [ ] **Step 4: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /d/nied && git add app/src/app/courses/[id]/[unit]/[section]/page.tsx && git commit -m "feat(reading): wire ReadingPacer into the lesson page"
```

---

## Task 11: Settings "Lectura" section

**Files:**
- Create: `src/components/reading-settings.tsx`
- Modify: `src/app/ajustes/page.tsx`

Replace the v0.5 placeholder with a real reading-prefs editor that shares the same `localStorage` store.

- [ ] **Step 1: Create the client wrapper**

```tsx
// src/components/reading-settings.tsx
"use client";

import { useReadingPrefs } from "@/lib/reading/use-reading-prefs";
import { ReadingControls, type ReadingControlsLabels } from "@/components/reading-controls";

export function ReadingSettings({ labels }: { labels: ReadingControlsLabels }) {
  const { prefs, hydrated, update } = useReadingPrefs();
  if (!hydrated) return null;
  return <ReadingControls prefs={prefs} onChange={update} labels={labels} />;
}
```

- [ ] **Step 2: Replace `app/ajustes/page.tsx`** entirely with:

```tsx
/**
 * /ajustes — preferencias de la instancia.
 */

import { Settings } from "@/components/icons";
import { ReadingSettings } from "@/components/reading-settings";
import type { ReadingControlsLabels } from "@/components/reading-controls";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  const labels: ReadingControlsLabels = {
    enable: t("reading.enable"),
    granularity: t("reading.granularity"),
    granLetter: t("reading.gran.letter"),
    granWord: t("reading.gran.word"),
    granSentence: t("reading.gran.sentence"),
    style: t("reading.style"),
    styleContainer: t("reading.style.container"),
    styleLine: t("reading.style.line"),
    styleGlow: t("reading.style.glow"),
    color: t("reading.color"),
    colorAccent: t("reading.colorAccent"),
    colorLine: t("reading.colorLine"),
    speed: t("reading.speed"),
    speedUnit: t("reading.speedUnit"),
  };

  return (
    <div className="mx-auto flex w-full max-w-reading flex-col gap-4 px-4 py-12 md:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-lg bg-accent-primary/10 text-accent-primary">
          <Settings className="size-6" strokeWidth={1.6} aria-hidden />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-fg-primary">
          {t("nav.settings")}
        </h1>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <h2 className="font-serif text-lg font-semibold text-fg-primary">
          {t("settings.readingTitle")}
        </h2>
        <p className="text-sm leading-6 text-fg-secondary">
          {t("settings.readingDesc")}
        </p>
        <ReadingSettings labels={labels} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /d/nied/app && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /d/nied && git add app/src/components/reading-settings.tsx app/src/app/ajustes/page.tsx && git commit -m "feat(reading): real Lectura settings section"
```

---

## Task 12: Playwright smoke verification

**Files:** none (manual/agent verification via Playwright MCP). The dev server is on `localhost:3000`.

- [ ] **Step 1: Navigate to a lesson**

Use Playwright MCP: `browser_navigate` to `http://localhost:3000/courses/estadistica-aplicada/u1/s1`. (First compile may take a while on this disk; wait for load.)

- [ ] **Step 2: Verify layout** — take a screenshot. Confirm the reading column is centered with balanced margins (no large dead right gutter).

- [ ] **Step 3: Verify the floating menu** — confirm a floating control (Play + menu button) is visible near bottom-center.

- [ ] **Step 4: Verify pacing** — click Play (`browser_click`). Take a screenshot after ~1s. Confirm a sentence is highlighted (default style = container) and earlier text reads at full opacity while later text is dimmed.

- [ ] **Step 5: Verify styles + color** — open the menu, switch style to "Línea": confirm a colored underline is drawn under read text. Change the accent color via a preset and confirm the highlight color updates live.

- [ ] **Step 6: Verify Off** — toggle "Guía de lectura" off. Confirm the text returns to plain (no dimming, no highlight) and is fully legible.

- [ ] **Step 7: Verify math/tables untouched** — scroll to a section with a KaTeX formula or table (e.g. u1 s1 has a table). Confirm formulas/tables are NOT broken into spans and remain selectable.

- [ ] **Step 8: Run the full unit-test suite**

Run: `cd /d/nied/app && bun test src/lib/__test__`
Expected: all tests pass (segment, reading-prefs, i18n parity, plus existing suites).

- [ ] **Step 9: Final commit (if any fixes were needed)**

```bash
cd /d/nied && git add -A && git commit -m "test(reading): verify pacer end-to-end (layout, pacing, styles, Off, math intact)"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- §3.1 layout centered + delete unit-toc → Task 5 ✓
- §3.2 ReadingPacer (granularity/style/color/wpm/play/off/keyboard/reduced-motion/omit math) → Tasks 1, 8, 9 ✓ (reduced-motion in Task 6 hook + Task 4 CSS)
- §3.3 floating menu + localStorage persistence → Tasks 6, 9 ✓
- §3.4 Settings "Lectura" → Task 11 ✓
- §7 testing (tokenizer-core, prefs, i18n, Playwright smoke) → Tasks 1, 2, 3, 12 ✓
- §8 file deltas → all covered ✓

**Note on §3.3 "defaults seed localStorage":** simplified to a single `nied-reading` store edited by both the floating menu and Settings (no separate defaults layer) — there is no server-side per-user config (config is env-only), so one store is the honest source of truth. Behavior matches the spec's intent: set once, persists everywhere.

**Placeholder scan:** no TBD/TODO; every code step has complete code. ✓

**Type consistency:** `ReadingPrefs`, `Granularity`, `HighlightStyle`, `coercePrefs`, `tokenizeArticle`/`Tokenized`, `ReadingControlsLabels`, `ReadingPacerLabels`, CSS class names (`pc`, `unread/read/box/block/glow-trail/ul/ulhead/lit/littrail`) are consistent across tasks. ✓
