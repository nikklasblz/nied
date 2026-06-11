/**
 * /tracks/[id]/[unidad]/s[N] — lección individual (una sección de la unidad).
 *
 * Server component. Renderiza el contenido de la sección con navegación
 * anterior/siguiente y un indicador de progreso.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnit, getUnitSections } from "@/lib/content/loader";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { ChevronLeft, ChevronRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string; unidad: string; seccion: string }>;
}) {
  const { id, unidad, seccion } = await params;

  // Solo acepta "s1", "s2", "s3", …
  const sMatch = /^s(\d+)$/.exec(seccion);
  if (!sMatch) notFound();
  const sectionIndex = Number(sMatch[1]);

  const ctx = await getUnit(id, unidad);
  if (!ctx) notFound();

  const unitSections = await getUnitSections(id, unidad);
  if (!unitSections || unitSections.sections.length === 0) notFound();

  const section = unitSections.sections.find((s) => s.index === sectionIndex);
  if (!section) notFound();

  const prevSection = unitSections.sections.find(
    (s) => s.index === sectionIndex - 1
  );
  const nextSection = unitSections.sections.find(
    (s) => s.index === sectionIndex + 1
  );
  const totalSections = unitSections.sections.length;

  const { track, unit } = ctx;

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
        <Link href={`/tracks/${id}/${unidad}`} className="hover:text-fg-primary">
          {unit.titulo}
        </Link>
        <span className="text-fg-muted">/</span>
        <span className="text-fg-primary">Sección {sectionIndex}</span>
      </nav>

      {/* Indicador de progreso */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 font-mono text-xs text-fg-muted">
          LECCIÓN {sectionIndex} DE {totalSections}
        </span>
        <div className="flex-1 h-1 rounded-full bg-bg-overlay">
          <div
            className="h-1 rounded-full bg-accent-primary transition-all duration-300"
            style={{ width: `${(sectionIndex / totalSections) * 100}%` }}
          />
        </div>
      </div>

      {/* Contenido de la sección */}
      <article
        className="prose-niED"
        dangerouslySetInnerHTML={{ __html: section.html }}
      />

      {/* Navegación anterior / siguiente */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        {prevSection ? (
          <Link
            href={`/tracks/${id}/${unidad}/s${prevSection.index}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <ChevronLeft className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-xs text-fg-muted">Anterior</div>
              <div>{prevSection.title}</div>
            </div>
          </Link>
        ) : (
          <Link
            href={`/tracks/${id}/${unidad}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <ChevronLeft className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-xs text-fg-muted">Volver</div>
              <div>Mapa de la unidad</div>
            </div>
          </Link>
        )}

        {nextSection ? (
          <Link
            href={`/tracks/${id}/${unidad}/s${nextSection.index}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <div className="text-right">
              <div className="text-xs text-fg-muted">Siguiente</div>
              <div>{nextSection.title}</div>
            </div>
            <ChevronRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          </Link>
        ) : (
          <Link
            href={`/tracks/${id}/${unidad}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <div className="text-right">
              <div className="text-xs text-fg-muted">Completar</div>
              <div>Volver al mapa</div>
            </div>
            <ChevronRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
