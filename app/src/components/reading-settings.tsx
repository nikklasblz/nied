// src/components/reading-settings.tsx
"use client";

import { useReadingPrefs } from "@/lib/reading/use-reading-prefs";
import { ReadingControls, type ReadingControlsLabels } from "@/components/reading-controls";

export function ReadingSettings({ labels }: { labels: ReadingControlsLabels }) {
  const { prefs, hydrated, update } = useReadingPrefs();
  if (!hydrated) return null;
  return <ReadingControls prefs={prefs} onChange={update} labels={labels} />;
}
