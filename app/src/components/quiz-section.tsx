"use client";

/**
 * QuizSection — componente de quiz auto-corregido para niED.
 *
 * Renderiza preguntas de opción múltiple, valida contra el server action,
 * muestra feedback con explicación y dispara toast de XP al acertar.
 */

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, HelpCircle, Zap } from "@/components/icons";
import { submitQuizAnswer } from "@/app/actions/quiz";
import type { Quiz } from "@/lib/content/quiz-loader";

export type QuizLabels = {
  /** aria-label de la sección. */
  aria: string;
  title: string;
  completed: string;
  check: string;
  checking: string;
  done: string;
  correctAnswer: string;
  xpPerQuestion: string;
};

interface QuizSectionProps {
  courseId: string;
  unitId: string;
  quiz: Quiz;
  previousAttempts: { questionIndex: number; correct: boolean }[];
  labels: QuizLabels;
}

interface QuestionState {
  selectedOption: number | null;
  submitted: boolean;
  correct: boolean | null;
  explanation: string | null;
  xpAwarded: number;
}

function XpGainToast({ xp, label }: { xp: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-center gap-3 rounded-xl border border-accent-primary/40 bg-popover px-4 py-3 shadow-xp-glow"
    >
      <Zap className="size-5 text-accent-primary" strokeWidth={2} aria-hidden />
      <div className="flex flex-col">
        <span className="font-mono text-base font-semibold tabular-nums text-accent-primary">
          +{xp} XP
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-secondary">
          {label}
        </span>
      </div>
    </motion.div>
  );
}

function QuizQuestion({
  question,
  options,
  correctIndex,
  explanation,
  section,
  index,
  totalQuestions,
  courseId,
  unitId,
  xpPerQuestion,
  initialState,
  labels,
}: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  section?: string;
  index: number;
  totalQuestions: number;
  courseId: string;
  unitId: string;
  xpPerQuestion: number;
  initialState: QuestionState;
  labels: QuizLabels;
}) {
  const [state, setState] = useState<QuestionState>(initialState);
  const [isPending, startTransition] = useTransition();

  const handleOptionSelect = (optionIdx: number) => {
    if (state.submitted) return;
    setState((prev) => ({ ...prev, selectedOption: optionIdx }));
  };

  const handleSubmit = () => {
    if (state.selectedOption === null || state.submitted) return;

    startTransition(async () => {
      const result = await submitQuizAnswer(
        courseId,
        unitId,
        index,
        state.selectedOption!
      );

      setState((prev) => ({
        ...prev,
        submitted: true,
        correct: result.correct,
        explanation: result.explanation,
        xpAwarded: result.xpAwarded,
      }));

      if (result.correct && result.xpAwarded > 0) {
        toast.custom(
          () => (
            <XpGainToast xp={result.xpAwarded} label={labels.correctAnswer} />
          ),
          { duration: 2800 }
        );
      }
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-bg-elevated p-5 transition-colors duration-200",
        state.submitted && state.correct
          ? "border-success/50"
          : state.submitted && !state.correct
            ? "border-danger/50"
            : "border-border"
      )}
    >
      {/* Encabezado de pregunta */}
      <div className="mb-4 flex items-start gap-3">
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-bg-overlay px-2 py-0.5">
          <span className="font-mono text-[11px] text-fg-muted">
            {index + 1}/{totalQuestions}
          </span>
        </div>
        <div className="flex-1">
          {section && (
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
              {section}
            </p>
          )}
          <p className="font-sans text-sm font-medium leading-relaxed text-fg-primary">
            {question}
          </p>
        </div>
      </div>

      {/* Opciones */}
      <div className="flex flex-col gap-2">
        {options.map((option, optIdx) => {
          const isSelected = state.selectedOption === optIdx;
          const isCorrect = optIdx === correctIndex;
          const showResult = state.submitted;

          return (
            <button
              key={optIdx}
              onClick={() => handleOptionSelect(optIdx)}
              disabled={state.submitted || isPending}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-all duration-150",
                "disabled:cursor-default",
                // Estado base (no enviado)
                !showResult && !isSelected && "border-border bg-bg-overlay hover:bg-bg-elevated text-fg-secondary hover:text-fg-primary",
                !showResult && isSelected && "border-accent-primary/60 bg-accent-primary/10 text-fg-primary ring-2 ring-accent-primary/40",
                // Estado post-envío
                showResult && !isSelected && !isCorrect && "border-border/50 bg-bg-overlay/50 text-fg-muted opacity-60",
                showResult && isCorrect && "border-success/60 bg-success/10 text-fg-primary",
                showResult && isSelected && !isCorrect && "border-danger/60 bg-danger/10 text-fg-primary"
              )}
              style={{ transition: "all 150ms cubic-bezier(0.23, 1, 0.32, 1)" }}
            >
              <div className="flex items-center gap-3">
                {/* Indicador de opción */}
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-medium",
                    !showResult && !isSelected && "border-fg-muted/40 text-fg-muted",
                    !showResult && isSelected && "border-accent-primary bg-accent-primary text-white",
                    showResult && isCorrect && "border-success bg-success text-white",
                    showResult && isSelected && !isCorrect && "border-danger bg-danger text-white",
                    showResult && !isSelected && !isCorrect && "border-fg-muted/30 text-fg-muted/50"
                  )}
                >
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className="text-sm leading-snug">{option}</span>
                {/* Icono de resultado */}
                {showResult && isCorrect && (
                  <CheckCircle2 className="ml-auto size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
                )}
                {showResult && isSelected && !isCorrect && (
                  <XCircle className="ml-auto size-4 shrink-0 text-danger" strokeWidth={2} aria-hidden />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback post-envío */}
      <AnimatePresence>
        {state.submitted && state.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "rounded-lg border px-4 py-3",
                state.correct
                  ? "border-success/30 bg-success/10"
                  : "border-danger/30 bg-danger/10"
              )}
            >
              <div className="flex items-start gap-2">
                {state.correct ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
                ) : (
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} aria-hidden />
                )}
                <p
                  className={cn(
                    "text-sm italic leading-relaxed",
                    state.correct ? "text-success" : "text-danger"
                  )}
                >
                  {state.explanation}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón de envío */}
      {!state.submitted && (
        <div className="mt-4">
          <button
            onClick={handleSubmit}
            disabled={state.selectedOption === null || isPending}
            className={cn(
              "rounded-lg px-5 py-2 font-sans text-sm font-medium transition-all duration-150",
              "bg-accent-primary text-white",
              "hover:brightness-110 active:scale-95",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
            style={{ transition: "all 150ms cubic-bezier(0.23, 1, 0.32, 1)" }}
          >
            {isPending ? labels.checking : labels.check}
          </button>
        </div>
      )}
    </div>
  );
}

export function QuizSection({
  courseId,
  unitId,
  quiz,
  previousAttempts,
  labels,
}: QuizSectionProps) {
  // Construye el mapa de intentos anteriores por questionIndex
  const attemptMap = new Map<number, boolean>();
  for (const a of previousAttempts) {
    attemptMap.set(a.questionIndex, a.correct);
  }

  // Estado inicial de cada pregunta (restaurado desde DB)
  const buildInitialState = (idx: number): QuestionState => {
    const wasCorrect = attemptMap.get(idx);
    if (wasCorrect !== undefined) {
      return {
        selectedOption: quiz.questions[idx].correct_index,
        submitted: true,
        correct: wasCorrect,
        explanation: quiz.questions[idx].explanation,
        xpAwarded: 0, // Ya otorgado en sesión anterior
      };
    }
    return {
      selectedOption: null,
      submitted: false,
      correct: null,
      explanation: null,
      xpAwarded: 0,
    };
  };

  const totalCompleted = previousAttempts.length;
  const totalQuestions = quiz.questions.length;

  return (
    <section
      aria-label={labels.aria}
      className="rounded-xl border border-border bg-card/60 px-5 py-5"
    >
      {/* Encabezado del quiz */}
      <div className="mb-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
            {labels.title}
          </h2>
          {totalCompleted > 0 && (
            <span className="font-mono text-[11px] text-fg-secondary tabular-nums">
              {totalCompleted}/{totalQuestions} {labels.completed}
            </span>
          )}
        </div>
        <p className="font-sans text-base font-semibold text-fg-primary">
          {quiz.title}
        </p>
        <p className="text-sm text-fg-secondary">{quiz.instructions}</p>
        <div className="flex items-center gap-1.5 font-mono text-xs text-accent-primary">
          <Zap className="size-3" strokeWidth={2} aria-hidden />
          <span>
            {quiz.xp_per_question} {labels.xpPerQuestion}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      {totalCompleted > 0 && (
        <div className="mb-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-overlay">
            <motion.div
              className="h-full rounded-full bg-accent-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(totalCompleted / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            />
          </div>
        </div>
      )}

      {/* Preguntas */}
      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, idx) => (
          <QuizQuestion
            key={idx}
            question={q.question}
            options={q.options}
            correctIndex={q.correct_index}
            explanation={q.explanation}
            section={q.section}
            index={idx}
            totalQuestions={totalQuestions}
            courseId={courseId}
            unitId={unitId}
            xpPerQuestion={quiz.xp_per_question}
            initialState={buildInitialState(idx)}
            labels={labels}
          />
        ))}
      </div>

      {/* Mensaje de quiz completo */}
      <AnimatePresence>
        {totalCompleted === totalQuestions && totalQuestions > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="mt-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3"
          >
            <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={2} aria-hidden />
            <p className="text-sm font-medium text-success">
              {labels.done}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
