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
