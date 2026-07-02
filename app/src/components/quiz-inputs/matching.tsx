"use client";

import { cn } from "@/lib/utils";
import { seededShuffle } from "@/lib/quiz/seeded-shuffle";
import type { QuizInputProps } from "./types";

export function MatchingInput({ question, value, onChange, submitted, seed, labels }: QuizInputProps) {
  if (question.type !== "matching") return null;
  const pairs = question.pairs;
  // shuffled display order of right options (original indices), stable per seed
  const rightOrder = seededShuffle(pairs.length, seed + 1);
  const chosen = Array.isArray(value) ? (value as number[]) : new Array(pairs.length).fill(-1);

  const setAt = (leftIdx: number, rightOriginalIdx: number) => {
    if (submitted) return;
    const next = chosen.slice();
    while (next.length < pairs.length) next.push(-1);
    next[leftIdx] = rightOriginalIdx;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {pairs.map((pair, i) => {
        const ok = submitted && chosen[i] === i;
        const bad = submitted && chosen[i] !== i;
        return (
          <div key={i} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", ok && "border-success/60 bg-success/10", bad && "border-danger/60 bg-danger/10", !submitted && "border-border")}>
            <span className="flex-1 text-sm text-fg-primary">{pair.left}</span>
            <span className="text-fg-muted">→</span>
            <select
              value={chosen[i] >= 0 ? chosen[i] : ""}
              disabled={submitted}
              onChange={(e) => setAt(i, Number(e.target.value))}
              className="rounded-md border border-border bg-bg-overlay px-2 py-1 text-sm text-fg-primary"
            >
              <option value="" disabled>{labels.selectMatch}</option>
              {rightOrder.map((origIdx) => (
                <option key={origIdx} value={origIdx}>{pairs[origIdx].right}</option>
              ))}
            </select>
            {submitted && bad && <span className="text-xs text-fg-muted">{labels.correctIs}: {pair.right}</span>}
          </div>
        );
      })}
    </div>
  );
}
