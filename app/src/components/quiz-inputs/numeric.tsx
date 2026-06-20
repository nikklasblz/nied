"use client";

import { cn } from "@/lib/utils";
import type { QuizInputProps } from "./types";

export function NumericInput({ question, value, onChange, submitted, correct, labels }: QuizInputProps) {
  if (question.type !== "numeric") return null;
  const v = typeof value === "number" ? String(value) : "";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={v}
          disabled={submitted}
          placeholder={labels.numericPlaceholder}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
          }}
          className={cn(
            "w-40 rounded-lg border bg-bg-overlay px-3 py-2 text-sm text-fg-primary outline-none",
            !submitted && "border-border focus:border-accent-primary",
            submitted && correct && "border-success/60",
            submitted && correct === false && "border-danger/60"
          )}
        />
        {question.unit && <span className="text-sm text-fg-secondary">{question.unit}</span>}
      </div>
      {submitted && (
        <p className="text-xs text-fg-muted">
          {labels.correctIs}: <span className="text-fg-primary">{question.answer}{question.unit ? ` ${question.unit}` : ""}</span>
          {question.tolerance > 0 ? ` (±${question.tolerance})` : ""}
        </p>
      )}
    </div>
  );
}
