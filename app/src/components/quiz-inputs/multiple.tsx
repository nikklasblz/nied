"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "@/components/icons";
import type { QuizInputProps } from "./types";

export function MultipleInput({ question, value, onChange, submitted, labels }: QuizInputProps) {
  if (question.type !== "multiple") return null;
  const selected = Array.isArray(value) ? (value as number[]) : [];
  const toggle = (i: number) => {
    if (submitted) return;
    onChange(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i].sort((a, b) => a - b));
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">{labels.multipleHint}</p>
      {question.options.map((option, i) => {
        const isSel = selected.includes(i);
        const isCorrect = question.correct_indices.includes(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            disabled={submitted}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
              !submitted && isSel && "border-accent-primary/60 bg-accent-primary/10 text-fg-primary",
              !submitted && !isSel && "border-border bg-bg-overlay text-fg-secondary hover:text-fg-primary",
              submitted && isCorrect && "border-success/60 bg-success/10 text-fg-primary",
              submitted && !isCorrect && isSel && "border-danger/60 bg-danger/10 text-fg-primary",
              submitted && !isCorrect && !isSel && "border-border/50 opacity-60"
            )}
          >
            <span className={cn("grid size-5 shrink-0 place-items-center rounded border", isSel ? "border-accent-primary bg-accent-primary text-white" : "border-fg-muted/40")}>
              {isSel && "✓"}
            </span>
            <span className="leading-snug">{option}</span>
            {submitted && isCorrect && <CheckCircle2 className="ml-auto size-4 text-success" />}
            {submitted && !isCorrect && isSel && <XCircle className="ml-auto size-4 text-danger" />}
          </button>
        );
      })}
    </div>
  );
}
