import type { QuizQuestion, QuizResponse } from "@nied/schema";

export type QuizInputLabels = {
  submit: string;
  yourAnswer: string;
  correctIs: string;
  numericPlaceholder: string;
  shortPlaceholder: string;
  selectMatch: string;
  multipleHint: string;
  orderingHint: string;
  moveUp: string;
  moveDown: string;
};

/** Props shared by every per-type input component. */
export interface QuizInputProps<Q extends QuizQuestion = QuizQuestion> {
  question: Q;
  /** Current draft response (null until the learner picks something). */
  value: QuizResponse | null;
  /** Report a new draft response to the parent. */
  onChange: (response: QuizResponse) => void;
  /** True once submitted — inputs become read-only and reveal the answer. */
  submitted: boolean;
  /** Whether the submitted answer was correct (for styling); null pre-submit. */
  correct: boolean | null;
  /** Stable seed for deterministic shuffles (the question index). */
  seed: number;
  labels: QuizInputLabels;
}
