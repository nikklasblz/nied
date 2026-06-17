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
