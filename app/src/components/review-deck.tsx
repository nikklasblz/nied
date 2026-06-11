"use client";

/**
 * ReviewDeck — mazo de repaso espaciado (Leitner) de niED.
 *
 * Muestra una card a la vez: indicador de caja + pregunta. Al pulsar
 * "Mostrar respuesta" se revelan las opciones (la correcta resaltada)
 * y la explicación; luego el usuario se autocalifica con dos botones
 * ("La sabía" / "No la sabía") que llaman al server action submitReview
 * y avanzan a la siguiente card con una transición sutil.
 *
 * Client component: los labels llegan por props desde el server parent.
 */

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, HelpCircle, Eye, Layers } from "@/components/icons";
import { submitReview, type DueCardView } from "@/app/actions/srs";

export type ReviewLabels = {
  show: string;
  correct: string;
  wrong: string;
  empty: string;
  box: string;
};

interface ReviewDeckProps {
  cards: DueCardView[];
  labels: ReviewLabels;
}

const EASE = [0.23, 1, 0.32, 1] as const;

export function ReviewDeck({ cards, labels }: ReviewDeckProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const card = cards[index];
  const done = index >= cards.length;

  const handleGrade = (correct: boolean) => {
    if (!card || isPending) return;
    startTransition(async () => {
      try {
        await submitReview(
          card.courseId,
          card.unitId,
          card.questionIndex,
          correct
        );
      } catch (err) {
        // Card huérfana o ya revisada: no bloquear el flujo de repaso.
        console.error("submitReview failed", err);
      }
      setRevealed(false);
      setIndex((i) => i + 1);
    });
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-5 py-5"
      >
        <CheckCircle2 className="size-5 shrink-0 text-success" strokeWidth={2} aria-hidden />
        <p className="text-sm font-medium text-success">{labels.empty}</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="rounded-xl border border-border bg-bg-elevated p-5"
      >
        {/* Encabezado: progreso del mazo + indicador de caja */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center justify-center rounded-lg bg-bg-overlay px-2 py-0.5">
            <span className="font-mono text-[11px] tabular-nums text-fg-muted">
              {index + 1}/{cards.length}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2.5 py-1 text-accent-primary">
            <Layers className="size-3.5" strokeWidth={1.8} aria-hidden />
            <span className="font-mono text-[11px] font-semibold tabular-nums">
              {labels.box} {card.box}/5
            </span>
          </div>
        </div>

        {/* Pregunta */}
        <p className="font-sans text-sm font-medium leading-relaxed text-fg-primary">
          {card.question}
        </p>

        {/* Botón de revelar */}
        {!revealed && (
          <div className="mt-4">
            <button
              onClick={() => setRevealed(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-5 py-2 font-sans text-sm font-medium",
                "bg-accent-primary text-white hover:brightness-110 active:scale-95"
              )}
              style={{ transition: "all 150ms cubic-bezier(0.23, 1, 0.32, 1)" }}
            >
              <Eye className="size-4" strokeWidth={1.8} aria-hidden />
              {labels.show}
            </button>
          </div>
        )}

        {/* Respuesta revelada: opciones + explicación + autocalificación */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                {card.options.map((option, optIdx) => {
                  const isCorrect = optIdx === card.correctIndex;
                  return (
                    <div
                      key={optIdx}
                      className={cn(
                        "w-full rounded-lg border px-4 py-3 text-left",
                        isCorrect
                          ? "border-success/60 bg-success/10 text-fg-primary"
                          : "border-border/50 bg-bg-overlay/50 text-fg-muted opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-medium",
                            isCorrect
                              ? "border-success bg-success text-white"
                              : "border-fg-muted/30 text-fg-muted/50"
                          )}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-sm leading-snug">{option}</span>
                        {isCorrect && (
                          <CheckCircle2
                            className="ml-auto size-4 shrink-0 text-success"
                            strokeWidth={2}
                            aria-hidden
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explicación */}
              <div className="mt-3 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-4 py-3">
                <div className="flex items-start gap-2">
                  <HelpCircle
                    className="mt-0.5 size-4 shrink-0 text-accent-primary"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p className="text-sm italic leading-relaxed text-fg-secondary">
                    {card.explanation}
                  </p>
                </div>
              </div>

              {/* Autocalificación */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => handleGrade(false)}
                  disabled={isPending}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border border-danger/50 bg-danger/10 px-5 py-2",
                    "font-sans text-sm font-medium text-danger",
                    "hover:bg-danger/20 active:scale-95",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                  style={{ transition: "all 150ms cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  <XCircle className="size-4" strokeWidth={2} aria-hidden />
                  {labels.wrong}
                </button>
                <button
                  onClick={() => handleGrade(true)}
                  disabled={isPending}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 px-5 py-2",
                    "font-sans text-sm font-medium text-success",
                    "hover:bg-success/20 active:scale-95",
                    "disabled:cursor-not-allowed disabled:opacity-40"
                  )}
                  style={{ transition: "all 150ms cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  <CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />
                  {labels.correct}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
