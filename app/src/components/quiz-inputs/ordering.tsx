"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { seededShuffle } from "@/lib/quiz/seeded-shuffle";
import { ChevronUp, ChevronDown } from "@/components/icons";
import type { QuizInputProps } from "./types";

export function OrderingInput({ question, value, onChange, submitted, seed, labels }: QuizInputProps) {
  // Initialize order from value (if any) or a seeded shuffle. Item content is
  // looked up by original index; `order` holds original indices.
  const isOrdering = question.type === "ordering";
  const n = isOrdering ? question.items.length : 0;
  const [order, setOrder] = useState<number[]>(() =>
    Array.isArray(value) ? (value as number[]) : []
  );
  const dragIdx = useRef<number | null>(null);

  // Seed the initial shuffled order once on mount if no draft exists yet.
  useEffect(() => {
    if (order.length === 0 && n > 0) {
      const init = seededShuffle(n, seed + 7);
      setOrder(init);
      onChange(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOrdering) return null;

  const apply = (next: number[]) => {
    setOrder(next);
    onChange(next);
  };
  const move = (from: number, to: number) => {
    if (submitted || to < 0 || to >= order.length || from === to) return;
    const next = order.slice();
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    apply(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">{labels.orderingHint}</p>
      {order.map((origIdx, pos) => {
        const ok = submitted && origIdx === pos;
        const bad = submitted && origIdx !== pos;
        return (
          <div
            key={origIdx}
            draggable={!submitted}
            onDragStart={() => (dragIdx.current = pos)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx.current !== null) move(dragIdx.current, pos); dragIdx.current = null; }}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              !submitted && "cursor-grab border-border bg-bg-overlay active:cursor-grabbing",
              ok && "border-success/60 bg-success/10",
              bad && "border-danger/60 bg-danger/10"
            )}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bg-elevated font-mono text-[11px] text-fg-muted">{pos + 1}</span>
            <span className="flex-1 text-fg-primary">{question.items[origIdx]}</span>
            {!submitted && (
              <span className="flex gap-1">
                <button type="button" aria-label={labels.moveUp} onClick={() => move(pos, pos - 1)} className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg-primary disabled:opacity-30" disabled={pos === 0}>
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" aria-label={labels.moveDown} onClick={() => move(pos, pos + 1)} className="grid size-6 place-items-center rounded text-fg-muted hover:text-fg-primary disabled:opacity-30" disabled={pos === order.length - 1}>
                  <ChevronDown className="size-4" />
                </button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
