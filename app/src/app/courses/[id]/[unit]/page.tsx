/**
 * /courses/[id]/[unit] — vista general de la unidad (mapa de secciones).
 *
 * Server component. Muestra el preámbulo de la unidad y un mapa de lecciones
 * con una tarjeta por sección. El contenido largo de cada sección vive en
 * /courses/[id]/[unit]/s[N].
 *
 * Si la unidad está declarada en course.yaml pero su units/<id>.md aún no
 * existe, se renderiza un estado "Pendiente de generar".
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getUnitView } from "@/lib/content/courses";
import { getDb } from "@/lib/db/client";
import { getUnitProgress } from "@/lib/db/queries/progress";
import { getQuizAttempts } from "@/lib/db/queries/quiz";
import { loadQuiz } from "@/lib/content/quiz-loader";
import { unitXp } from "@/lib/gamification/xp";
import { MarkCompleteButton } from "@/components/mark-complete-button";
import { QuizSection } from "@/components/quiz-section";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { levelLabel, levelStyle } from "@/components/course-card";
import { ChevronLeft, ChevronRight, Clock, Zap } from "@/components/icons";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function UnitPage({
  params,
}: {
  params: Promise<{ id: string; unit: string }>;
}) {
  const { id, unit: unitId } = await params;
  const course = getCourse(id);
  if (!course) notFound();
  const unit = course.meta.units.find((u) => u.id === unitId);
  if (!unit) notFound();

  const view = await getUnitView(id, unitId);
  const xp = unitXp(unit);

  const db = getDb();
  const progress = getUnitProgress(db, id, unitId);
  const status = progress?.status ?? "pendiente";
  const completedAt = progress?.completed_at ?? null;

  const quiz = view ? loadQuiz(id, unitId) : null;
  const quizAttempts = quiz
    ? getQuizAttempts(db, id, unitId)
        .filter((a) => a.correct === 1)
        .map((a) => ({
          questionIndex: a.question_index,
          correct: true as const,
        }))
    : [];

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
      <MermaidRenderer />

      {/* Breadcrumb */}
      <nav
        aria-label={t("common.breadcrumb")}
        className="flex items-center gap-1 text-xs text-fg-secondary"
      >
        <Link href="/courses" className="hover:text-fg-primary">
          {t("nav.courses")}
        </Link>
        <span className="text-fg-muted">/</span>
        <Link href={`/courses/${id}`} className="hover:text-fg-primary">
          {course.meta.title}
        </Link>
        <span className="text-fg-muted">/</span>
        <span className="text-fg-primary">{unit.title}</span>
      </nav>

      <Link
        href={`/courses/${id}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-fg-secondary hover:text-fg-primary"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.6} aria-hidden />
        {t("unit.backToSyllabus")}
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            {id} · {unit.id}
          </span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-wider",
              levelStyle[course.meta.level]
            )}
          >
            {levelLabel(course.meta.level)}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-fg-secondary">
            <Clock className="size-3" strokeWidth={1.6} aria-hidden />
            {unit.hours}h
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-accent-primary">
            <Zap className="size-3" strokeWidth={1.6} aria-hidden />
            {xp} XP
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold leading-tight text-fg-primary md:text-4xl">
          {unit.title}
        </h1>
      </header>

      {view ? (
        <>
          {/* Preámbulo (intro + objetivos) */}
          {view.preambleHtml && (
            <article
              id="unit-preamble"
              className="prose-niED"
              dangerouslySetInnerHTML={{ __html: view.preambleHtml }}
            />
          )}

          {/* Mapa de lecciones */}
          {view.sections.length > 0 && (
            <section aria-label={t("unit.lessonsAria")}>
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
                {t("unit.lessons")} ({view.sections.length})
              </h2>
              <ol className="flex flex-col gap-3">
                {view.sections.map((sec) => (
                  <li key={sec.index}>
                    <Link
                      href={`/courses/${id}/${unitId}/s${sec.index}`}
                      className="group flex items-center justify-between rounded-xl border border-border bg-card/60 px-5 py-4 transition-colors hover:border-accent-primary/40 hover:bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-overlay font-mono text-xs text-fg-muted ring-1 ring-border">
                          {sec.index}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-fg-primary group-hover:text-accent-primary transition-colors">
                            {sec.title}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className="size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-primary"
                        strokeWidth={1.5}
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Sección de evaluación */}
          {quiz && (
            <QuizSection
              courseId={id}
              unitId={unitId}
              quiz={quiz}
              previousAttempts={quizAttempts}
              labels={{
                aria: t("quiz.aria"),
                title: t("quiz.title"),
                completed: t("quiz.completed"),
                check: t("quiz.check"),
                checking: t("quiz.checking"),
                done: t("quiz.done"),
                correctAnswer: t("quiz.correctAnswer"),
                xpPerQuestion: t("quiz.xpPerQuestion"),
              }}
            />
          )}

          {/* Action footer */}
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <MarkCompleteButton
              courseId={id}
              unitId={unitId}
              status={status}
              completedAt={completedAt}
              labels={{
                markComplete: t("unit.markComplete"),
                completed: t("unit.completed"),
                unmark: t("unit.unmark"),
                unmarked: t("unit.unmarked"),
                unmarkedDesc: t("unit.unmarkedDesc"),
                markFailed: t("unit.markFailed"),
                multiplier: t("unit.multiplier"),
                achievementUnlocked: t("achievements.toast"),
              }}
            />
          </div>
        </>
      ) : (
        /* Unidad declarada en course.yaml pero sin units/<id>.md todavía */
        <section
          aria-label={t("unit.pendingAria")}
          className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-10 text-center"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
            {t("course.pendingGeneration")}
          </span>
          <p className="text-sm text-fg-secondary">
            {t("unit.notWritten")}
          </p>
          <ul className="mx-auto max-w-prose-nied list-inside list-disc text-left text-sm text-fg-secondary">
            {unit.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
