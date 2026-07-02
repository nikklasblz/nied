"use client";

import { cn } from "@/lib/utils";
import type { QuizInputProps } from "./types";

export function ShortInput({ question, value, onChange, submitted, correct, labels }: QuizInputProps) {
  if (question.type !== "short") return null;
  const v = typeof value === "string" ? value : "";
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={v}
        disabled={submitted}
        placeholder={labels.shortPlaceholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border bg-bg-overlay px-3 py-2 text-sm text-fg-primary outline-none",
          !submitted && "border-border focus:border-accent-primary",
          submitted && correct && "border-success/60",
          submitted && correct === false && "border-danger/60"
        )}
      />
      {submitted && (
        <p className="text-xs text-fg-muted">
          {labels.correctIs}: <span className="text-fg-primary">{question.accepted[0]}</span>
        </p>
      )}
    </div>
  );
}
