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
