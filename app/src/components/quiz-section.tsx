"use client";

/**
 * QuizSection — auto-graded quiz for niED. Renders one input per question type
 * and submits the typed response to the server action for grading.
 */

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, HelpCircle, Zap } from "@/components/icons";
import { submitQuizAnswer } from "@/app/actions/quiz";
import type { Quiz, QuizResponse } from "@nied/schema";
import { SingleInput } from "@/components/quiz-inputs/single";
import { NumericInput } from "@/components/quiz-inputs/numeric";
import { MultipleInput } from "@/components/quiz-inputs/multiple";
import { ShortInput } from "@/components/quiz-inputs/short";
import { MatchingInput } from "@/components/quiz-inputs/matching";
import type { QuizInputLabels, QuizInputProps } from "@/components/quiz-inputs/types";

export type QuizLabels = QuizInputLabels & {
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

interface QState {
  response: QuizResponse | null;
  submitted: boolean;
  correct: boolean | null;
  explanation: string | null;
  xpAwarded: number;
}

function renderInput(props: QuizInputProps) {
  switch (props.question.type) {
    case "single": return <SingleInput {...props} />;
    case "numeric": return <NumericInput {...props} />;
    case "multiple": return <MultipleInput {...props} />;
    case "short": return <ShortInput {...props} />;
    case "matching": return <MatchingInput {...props} />;
    // ordering added in Phase C
    default: return null;
  }
}

function QuizQuestionView({
  question, index, totalQuestions, courseId, unitId, xpPerQuestion, initialState, labels,
}: {
  question: Quiz["questions"][number];
  index: number;
  totalQuestions: number;
  courseId: string;
  unitId: string;
  xpPerQuestion: number;
  initialState: QState;
  labels: QuizLabels;
}) {
  const [state, setState] = useState<QState>(initialState);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (state.response === null || state.submitted) return;
    startTransition(async () => {
      const result = await submitQuizAnswer(courseId, unitId, index, state.response!);
      setState((p) => ({ ...p, submitted: true, correct: result.correct, explanation: result.explanation, xpAwarded: result.xpAwarded }));
      if (result.correct && result.xpAwarded > 0) {
        toast.custom(() => (
          <div className="flex items-center gap-3 rounded-xl border border-accent-primary/40 bg-popover px-4 py-3 shadow-xp-glow">
            <Zap className="size-5 text-accent-primary" strokeWidth={2} aria-hidden />
            <span className="font-mono text-base font-semibold text-accent-primary">+{result.xpAwarded} XP</span>
          </div>
        ), { duration: 2800 });
      }
    });
  };

  return (
    <div className={cn(
      "rounded-xl border bg-bg-elevated p-5 transition-colors",
      state.submitted && state.correct ? "border-success/50" : state.submitted && !state.correct ? "border-danger/50" : "border-border"
    )}>
      <div className="mb-4 flex items-start gap-3">
        <span className="shrink-0 rounded-lg bg-bg-overlay px-2 py-0.5 font-mono text-[11px] text-fg-muted">{index + 1}/{totalQuestions}</span>
        <div className="flex-1">
          {question.section && <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">{question.section.replace(/^#+\s*/, "")}</p>}
          <p className="text-sm font-medium leading-relaxed text-fg-primary">{question.question}</p>
        </div>
      </div>

      {renderInput({
        question,
        value: state.response,
        onChange: (r) => setState((p) => ({ ...p, response: r })),
        submitted: state.submitted,
        correct: state.correct,
        seed: index,
        labels,
      })}

      <AnimatePresence>
        {state.submitted && state.explanation && (
          <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 12 }} className="overflow-hidden">
            <div className={cn("rounded-lg border px-4 py-3", state.correct ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10")}>
              <div className="flex items-start gap-2">
                {state.correct ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : <HelpCircle className="mt-0.5 size-4 text-danger" />}
                <p className={cn("text-sm italic leading-relaxed", state.correct ? "text-success" : "text-danger")}>{state.explanation}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!state.submitted && (
        <div className="mt-4">
          <button
            onClick={submit}
            disabled={state.response === null || isPending}
            className="rounded-lg bg-accent-primary px-5 py-2 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? labels.checking : labels.submit}
          </button>
        </div>
      )}
    </div>
  );
}

export function QuizSection({ courseId, unitId, quiz, previousAttempts, labels }: QuizSectionProps) {
  const attemptMap = new Map<number, boolean>();
  for (const a of previousAttempts) attemptMap.set(a.questionIndex, a.correct);

  const buildInitial = (idx: number): QState => {
    const wasCorrect = attemptMap.get(idx);
    if (wasCorrect !== undefined) {
      return { response: null, submitted: true, correct: wasCorrect, explanation: quiz.questions[idx].explanation, xpAwarded: 0 };
    }
    return { response: null, submitted: false, correct: null, explanation: null, xpAwarded: 0 };
  };

  const totalCompleted = previousAttempts.length;
  const totalQuestions = quiz.questions.length;

  return (
    <section aria-label={labels.aria} className="rounded-xl border border-border bg-card/60 px-5 py-5">
      <div className="mb-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">{labels.title}</h2>
          {totalCompleted > 0 && <span className="font-mono text-[11px] text-fg-secondary">{totalCompleted}/{totalQuestions} {labels.completed}</span>}
        </div>
        <p className="text-base font-semibold text-fg-primary">{quiz.title}</p>
        <p className="text-sm text-fg-secondary">{quiz.instructions}</p>
        <div className="flex items-center gap-1.5 font-mono text-xs text-accent-primary">
          <Zap className="size-3" strokeWidth={2} aria-hidden />
          <span>{quiz.xp_per_question} {labels.xpPerQuestion}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, idx) => (
          <QuizQuestionView
            key={idx}
            question={q}
            index={idx}
            totalQuestions={totalQuestions}
            courseId={courseId}
            unitId={unitId}
            xpPerQuestion={quiz.xp_per_question}
            initialState={buildInitial(idx)}
            labels={labels}
          />
        ))}
      </div>

      <AnimatePresence>
        {totalCompleted === totalQuestions && totalQuestions > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
            <CheckCircle2 className="size-4 text-success" />
            <p className="text-sm font-medium text-success">{labels.done}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
