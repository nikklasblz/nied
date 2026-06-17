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
