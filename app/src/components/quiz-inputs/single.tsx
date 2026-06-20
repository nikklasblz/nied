"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "@/components/icons";
import type { QuizInputProps } from "./types";

export function SingleInput({ question, value, onChange, submitted }: QuizInputProps) {
  if (question.type !== "single") return null;
  const selected = typeof value === "number" ? value : null;
  return (
    <div className="flex flex-col gap-2">
      {question.options.map((option, optIdx) => {
        const isSelected = selected === optIdx;
        const isCorrect = optIdx === question.correct_index;
        return (
          <button
            key={optIdx}
            type="button"
            onClick={() => !submitted && onChange(optIdx)}
            disabled={submitted}
            className={cn(
              "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150",
              !submitted && !isSelected && "border-border bg-bg-overlay hover:bg-bg-elevated text-fg-secondary hover:text-fg-primary",
              !submitted && isSelected && "border-accent-primary/60 bg-accent-primary/10 text-fg-primary ring-2 ring-accent-primary/40",
              submitted && isCorrect && "border-success/60 bg-success/10 text-fg-primary",
              submitted && isSelected && !isCorrect && "border-danger/60 bg-danger/10 text-fg-primary",
              submitted && !isSelected && !isCorrect && "border-border/50 bg-bg-overlay/50 text-fg-muted opacity-60"
            )}
          >
            <span className="flex items-center gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]">
                {String.fromCharCode(65 + optIdx)}
              </span>
              <span className="leading-snug">{option}</span>
              {submitted && isCorrect && <CheckCircle2 className="ml-auto size-4 text-success" />}
              {submitted && isSelected && !isCorrect && <XCircle className="ml-auto size-4 text-danger" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
