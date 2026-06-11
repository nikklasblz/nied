/**
 * /tracks/[id]/[unidad] — vista general de la unidad (mapa de secciones).
 *
 * Server component.  Muestra el preámbulo de la unidad, un mapa de lecciones
 * con tarjetas una por sección, los ejercicios/capstone al final y el quiz de
 * evaluación.  El contenido largo de cada sección vive en
 * /tracks/[id]/[unidad]/s[N].
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnit, getUnitContent, getUnitSections } from "@/lib/content/loader";
import { getDb } from "@/lib/db/client";
import { getUnitProgress } from "@/lib/db/queries/progress";
import { getQuizAttempts } from "@/lib/db/queries/quiz";
import { loadQuiz } from "@/lib/content/quiz-loader";
import { MarkCompleteButton } from "@/components/mark-complete-button";
import { QuizSection } from "@/components/quiz-section";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { ChevronLeft, ChevronRight, Clock, Zap } from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dedicationStyle = {
  ligero: "border-foreground/15 bg-foreground/5 text-fg-secondary",
  sostenido:
    "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
  intensivo:
    "border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary",
} as const;

export default async function UnitPage({
  params,
}: {
  params: Promise<{ id: string; unidad: string }>;
}) {
  const { id, unidad } = await params;
  const ctx = await getUnit(id, unidad);
  if (!ctx) notFound();
  const { track, unit, html } = ctx;

  const db = getDb();
  const progress = getUnitProgress(db, id, unidad);
  const status = progress?.status ?? "pendiente";
  const completedAt = progress?.completed_at ?? null;

  const quiz = loadQuiz(id, unidad);
  const quizAttempts = quiz
    ? getQuizAttempts(db, id, unidad)
        .filter((a) => a.correct === 1)
        .map((a) => ({
          questionIndex: a.question_index,
          correct: true as const,
        }))
    : [];

  // Intentar cargar secciones del archivo contenido/uN.md
  const sections = await getUnitSections(id, unidad);
  const content = await getUnitContent(id, unidad);

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
      <MermaidRenderer />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-xs text-fg-secondary"
      >
        <Link href="/tracks" className="hover:text-fg-primary">
          Tracks
        </Link>
        <span className="text-fg-muted">/</span>
        <Link href={`/tracks/${id}`} className="hover:text-fg-primary">
          {track.titulo}
        </Link>
        <span className="text-fg-muted">/</span>
        <span className="text-fg-primary">{unit.titulo}</span>
      </nav>

      <Link
        href={`/tracks/${id}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-fg-secondary hover:text-fg-primary"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.6} aria-hidden />
        Volver al sílabo
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
              dedicationStyle[track.nivel_dedicacion]
            )}
          >
            {track.nivel_dedicacion}
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-fg-secondary">
            <Clock className="size-3" strokeWidth={1.6} aria-hidden />
            {unit.horas_estimadas}h
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-accent-primary">
            <Zap className="size-3" strokeWidth={1.6} aria-hidden />
            {unit.xp_reward} XP
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold leading-tight text-fg-primary md:text-4xl">
          {unit.titulo}
        </h1>
      </header>

      {/* Contenido: mapa de secciones (si existen) o fallback al HTML completo */}
      {sections && sections.sections.length > 0 ? (
        <>
          {/* Preámbulo (intro + mapa del recorrido) */}
          {sections.preamble.html && (
            <article
              id="unit-preamble"
              className="prose-niED"
              dangerouslySetInnerHTML={{ __html: sections.preamble.html }}
            />
          )}

          {/* Mapa de lecciones */}
          <section aria-label="Lecciones de la unidad">
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
              Lecciones ({sections.sections.length})
            </h2>
            <ol className="flex flex-col gap-3">
              {sections.sections.map((sec) => (
                <li key={sec.index}>
                  <Link
                    href={`/tracks/${id}/${unidad}/s${sec.index}`}
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

          {/* Ejercicios / Capstone */}
          {sections.exercises && (
            <section
              aria-label="Ejercicios y capstone"
              className="rounded-xl border border-border bg-card/60 px-5 py-4"
            >
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
                Ejercicios y capstone
              </h2>
              <div
                className="prose-niED text-sm [&_h2]:text-base [&_h3]:text-sm"
                dangerouslySetInnerHTML={{ __html: sections.exercises.html }}
              />
            </section>
          )}

          {/* Referencia: cuerpo del sílabo para esta unidad */}
          {html && (
            <section
              aria-label="Para profundizar"
              className="rounded-xl border border-border bg-card/60 px-5 py-4"
            >
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
                Para profundizar (referencias y desafíos del sílabo)
              </h2>
              <div
                className="prose-niED text-sm text-fg-secondary [&_h2]:text-base [&_h3]:text-sm"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </section>
          )}
        </>
      ) : content ? (
        /* Fallback: unidad sin secciones — mostrar contenido completo */
        <>
          <article
            id="unit-content"
            className="prose-niED"
            dangerouslySetInnerHTML={{ __html: content.html }}
          />
          {html && (
            <section
              aria-label="Para profundizar"
              className="rounded-xl border border-border bg-card/60 px-5 py-4"
            >
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-muted">
                Para profundizar (referencias y desafíos del sílabo)
              </h2>
              <div
                className="prose-niED text-sm text-fg-secondary [&_h2]:text-base [&_h3]:text-sm"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </section>
          )}
        </>
      ) : (
        /* Fallback: solo HTML del sílabo */
        <article
          id="unit-content"
          className="prose-niED"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {/* Sección de evaluación */}
      {quiz && (
        <QuizSection
          trackId={id}
          unitId={unidad}
          quiz={quiz}
          previousAttempts={quizAttempts}
        />
      )}

      {/* Action footer */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <MarkCompleteButton
          trackId={id}
          unitId={unidad}
          status={status}
          completedAt={completedAt}
        />
      </div>
    </div>
  );
}
