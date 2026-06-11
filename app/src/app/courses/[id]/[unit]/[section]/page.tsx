/**
 * /courses/[id]/[unit]/s[N] — lección individual (una sección de la unidad).
 *
 * Server component. Renderiza el contenido de la sección con navegación
 * anterior/siguiente y un indicador de progreso.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getUnitView } from "@/lib/content/courses";
import { MermaidRenderer } from "@/components/mermaid-renderer";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string; unit: string; section: string }>;
}) {
  const { id, unit: unitId, section: sectionParam } = await params;

  // Solo acepta "s1", "s2", "s3", …
  const sMatch = /^s(\d+)$/.exec(sectionParam);
  if (!sMatch) notFound();
  const sectionIndex = Number(sMatch[1]);

  const view = await getUnitView(id, unitId);
  if (!view || view.sections.length === 0) notFound();

  const section = view.sections.find((s) => s.index === sectionIndex);
  if (!section) notFound();

  const prevSection = view.sections.find((s) => s.index === sectionIndex - 1);
  const nextSection = view.sections.find((s) => s.index === sectionIndex + 1);
  const totalSections = view.sections.length;

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
          {view.course.meta.title}
        </Link>
        <span className="text-fg-muted">/</span>
        <Link href={`/courses/${id}/${unitId}`} className="hover:text-fg-primary">
          {view.unit.title}
        </Link>
        <span className="text-fg-muted">/</span>
        <span className="text-fg-primary">
          {t("unit.section")} {sectionIndex}
        </span>
      </nav>

      {/* Indicador de progreso */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 font-mono text-xs text-fg-muted">
          {`${t("unit.lesson")} ${sectionIndex} ${t("unit.of")} ${totalSections}`.toUpperCase()}
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
            href={`/courses/${id}/${unitId}/s${prevSection.index}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <ChevronLeft className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-xs text-fg-muted">{t("unit.previous")}</div>
              <div>{prevSection.title}</div>
            </div>
          </Link>
        ) : (
          <Link
            href={`/courses/${id}/${unitId}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <ChevronLeft className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <div>
              <div className="text-xs text-fg-muted">{t("unit.back")}</div>
              <div>{t("unit.unitMap")}</div>
            </div>
          </Link>
        )}

        {nextSection ? (
          <Link
            href={`/courses/${id}/${unitId}/s${nextSection.index}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <div className="text-right">
              <div className="text-xs text-fg-muted">{t("unit.next")}</div>
              <div>{nextSection.title}</div>
            </div>
            <ChevronRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          </Link>
        ) : (
          <Link
            href={`/courses/${id}/${unitId}`}
            className="inline-flex items-center gap-2 text-sm text-fg-secondary hover:text-fg-primary transition-colors"
          >
            <div className="text-right">
              <div className="text-xs text-fg-muted">{t("unit.complete")}</div>
              <div>{t("unit.backToMap")}</div>
            </div>
            <ChevronRight className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
