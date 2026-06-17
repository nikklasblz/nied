// src/components/reading-pacer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { tokenizeArticle, type Tokenized } from "@/lib/reading/tokenize-dom";
import { useReadingPrefs } from "@/lib/reading/use-reading-prefs";
import type { ReadingPrefs } from "@/lib/reading/prefs";
import { ReadingControls, type ReadingControlsLabels } from "@/components/reading-controls";
import { Play, Pause, BookOpen, ChevronLeft, ChevronRight } from "@/components/icons";

export type ReadingPacerLabels = ReadingControlsLabels & {
  menu: string;
  play: string;
  pause: string;
  back: string;
  forward: string;
  seek: string;
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
  const lastUnit = useRef<number>(-99);
  const fillRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const { prefs, hydrated, update } = useReadingPrefs();
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pacable, setPacable] = useState(true);
  const pathname = usePathname();

  prefsRef.current = prefs;

  // Update the scrubber fill width from the current reading position.
  const updateProgress = useCallback(() => {
    const t = tok.current;
    if (fillRef.current && t && t.total > 0) {
      const pct = Math.max(0, Math.min(100, (readChars.current / t.total) * 100));
      fillRef.current.style.width = `${pct}%`;
    }
  }, []);

  // Tokenize on mount / route change.
  useEffect(() => {
    if (!articleRef.current) return;
    setPlaying(false);
    readChars.current = 0;
    lastUnit.current = -99;
    const t = tokenizeArticle(articleRef.current);
    tok.current = t;
    setPacable(t.total > 0);
    renderFocus(-1);
    updateProgress();
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
      stop();
      setPlaying(false);
      readChars.current = 0;
      lastUnit.current = -99;
      renderFocus(-2); // plain
      updateProgress();
    } else {
      lastUnit.current = -99;
      renderFocus(playing || readChars.current > 0 ? Math.floor(readChars.current) : -1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.enabled, prefs.granularity, prefs.style]);

  const renderFocus = useCallback((focus: number) => {
    const t = tok.current;
    const p = prefsRef.current;
    if (!t || !p) return;
    const perChar = p.granularity === "letter" || p.style === "line";
    const unit = focus < 0 ? focus : perChar ? focus : p.granularity === "word" ? t.charWord[Math.min(focus, t.total - 1)] : t.charSent[Math.min(focus, t.total - 1)];
    if (unit === lastUnit.current) return;
    lastUnit.current = unit;
    // focus === -2 → plain (Off); focus === -1 → idle (enabled, not started)
    const plain = focus < 0;
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
        } else if (inUnit) cls += " hlblock";
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
        readChars.current = t.total;
        renderFocus(t.total - 1);
        updateProgress();
        setPlaying(false);
        return;
      }
      renderFocus(focus);
      updateProgress();
      rafRef.current = requestAnimationFrame(tick);
    },
    [renderFocus, updateProgress]
  );

  const play = useCallback(() => {
    if (!tok.current || tok.current.total === 0) return;
    if (readChars.current >= tok.current.total) readChars.current = 0;
    lastTs.current = 0;
    setPlaying(true);
    articleRef.current?.focus();
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
      if (!t || !p || !p.enabled) return;
      const cur = Math.max(0, Math.floor(readChars.current));
      // jump to next/prev sentence (or word) boundary for a meaningful step
      const arr = p.granularity === "sentence" ? t.charSent : t.charWord;
      const curUnit = arr[Math.min(cur, t.total - 1)] ?? 0;
      const target = curUnit + dir;
      lastUnit.current = -99;
      if (target < 0) {
        readChars.current = 0;
        renderFocus(-1);
        updateProgress();
        return;
      }
      let idx = t.total - 1;
      for (let i = 0; i < t.total; i++) {
        if (arr[i] === target) { idx = i; break; }
      }
      readChars.current = idx;
      renderFocus(idx);
      updateProgress();
    },
    [renderFocus, updateProgress]
  );

  // Seek to a fraction [0,1] of the article (scrubber).
  const seek = useCallback(
    (fraction: number) => {
      const t = tok.current;
      const p = prefsRef.current;
      if (!t || !p || !p.enabled || t.total === 0) return;
      const clamped = Math.max(0, Math.min(1, fraction));
      readChars.current = clamped * t.total;
      lastUnit.current = -99;
      articleRef.current?.focus();
      renderFocus(Math.min(Math.floor(readChars.current), t.total - 1));
      updateProgress();
    },
    [renderFocus, updateProgress]
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0) seek((clientX - r.left) / r.width);
    },
    [seek]
  );

  // Click anywhere in the prose to move the guide to that character.
  const onArticleClick = useCallback(
    (e: React.MouseEvent) => {
      const p = prefsRef.current;
      const t = tok.current;
      if (!p || !p.enabled || !t) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return; // don't hijack text selection / copy
      const span = (e.target as HTMLElement)?.closest?.(".pc") as HTMLElement | null;
      if (!span) return;
      const idx = t.chars.indexOf(span);
      if (idx < 0) return;
      readChars.current = idx;
      lastUnit.current = -99;
      renderFocus(idx);
      updateProgress();
      articleRef.current?.focus();
    },
    [renderFocus, updateProgress]
  );

  // Keyboard shortcuts (only when enabled + pacable, and reader focused).
  useEffect(() => {
    if (!prefs.enabled || !pacable) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!articleRef.current || !articleRef.current.contains(document.activeElement)) return;
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

  const ctrlBtn =
    "grid size-8 place-items-center rounded-full text-fg-secondary hover:text-fg-primary disabled:opacity-30 disabled:hover:text-fg-secondary";

  return (
    <div className="relative">
      <div
        ref={articleRef}
        tabIndex={-1}
        onClick={onArticleClick}
        className={prefs.enabled ? "pacer outline-none" : "outline-none"}
      >
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
          <div className="flex w-64 flex-col gap-2 rounded-2xl border border-border bg-bg-elevated px-3 py-2 shadow-lg">
            {/* Scrubber */}
            <div
              ref={trackRef}
              role="slider"
              aria-label={labels.seek}
              aria-valuemin={0}
              aria-valuemax={100}
              onPointerDown={(e) => {
                if (!prefs.enabled) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                dragging.current = true;
                seekFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (dragging.current) seekFromClientX(e.clientX);
              }}
              onPointerUp={(e) => {
                dragging.current = false;
                try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ }
              }}
              className={`group h-2 w-full rounded-full bg-bg-overlay ${
                prefs.enabled ? "cursor-pointer" : "pointer-events-none opacity-40"
              }`}
            >
              <div ref={fillRef} className="h-full w-0 rounded-full bg-accent-primary" />
            </div>

            {/* Transport controls */}
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={!prefs.enabled}
                aria-label={labels.back}
                className={ctrlBtn}
              >
                <ChevronLeft className="size-4" />
              </button>
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
                onClick={() => step(1)}
                disabled={!prefs.enabled}
                aria-label={labels.forward}
                className={ctrlBtn}
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={labels.menu}
                className={ctrlBtn}
              >
                <BookOpen className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
