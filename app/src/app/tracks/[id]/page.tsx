/**
 * /tracks/[id] — sílabo de un track.
 *
 * Hero con título + dedicación, stats agregadas, mapa de unidades vertical,
 * sidebar con "Recursos globales" extraídos del syllabus.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrackById } from "@/lib/content/loader";
import { getDb } from "@/lib/db/client";
import { getAllProgress } from "@/lib/db/queries/progress";
import { getTotalXpByTrack } from "@/lib/db/queries/xp";
import { UnitCard, type UnitStatus } from "@/components/unit-card";
import {
  ChevronLeft,
  Clock,
  Zap,
  Target,
  Library,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const dedicationStyle = {
  ligero: "border-foreground/15 bg-foreground/5 text-fg-secondary",
  sostenido: "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
  intensivo:
    "border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary",
} as const;

function extractSection(markdown: string, heading: string): string | null {
  // Busca `## <heading>` y devuelve el texto hasta el siguiente `## ` (o EOF).
  const re = new RegExp(`^##\\s+${heading}\\s*$`, "im");
  const m = re.exec(markdown);
  if (!m) return null;
  const start = m.index + m[0].length;
  const after = markdown.slice(start);
  const next = /^##\s+/m.exec(after);
  const body = next ? after.slice(0, next.index) : after;
  return body.trim();
}

function firstParagraph(text: string): string {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paras[0] ?? "";
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const syllabus = await getTrackById(id);
  if (!syllabus) notFound();

  const track = syllabus.meta;
  const db = getDb();
  const allProgress = getAllProgress(db);
  const trackProgress = new Map(
    allProgress
      .filter((p) => p.track_id === track.track_id)
      .map((p) => [p.unit_id, p.status as UnitStatus])
  );

  const totalUnits = track.unidades.length;
  const completedUnits = Array.from(trackProgress.values()).filter(
    (s) => s === "completa"
  ).length;
  const totalXp = track.unidades.reduce((a, u) => a + u.xp_reward, 0);
  const totalHours = track.unidades.reduce((a, u) => a + u.horas_estimadas, 0);
  const earnedXp = getTotalXpByTrack(db, track.track_id);
  const pct = totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

  // Texto descriptivo: primer párrafo de "## Resumen" si existe.
  const resumen = extractSection(syllabus.fullMarkdown, "Resumen");
  const description =
    resumen ?? firstParagraph(syllabus.fullMarkdown);

  // Recursos globales (se renderiza el HTML correspondiente si existe).
  const recursosMd = extractSection(syllabus.fullMarkdown, "Recursos globales");

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
      <Link
        href="/tracks"
        className="inline-flex w-fit items-center gap-1 text-xs text-fg-secondary hover:text-fg-primary"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.6} aria-hidden />
        Volver a tracks
      </Link>

      {/* Hero */}
      <header className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            {track.track_id}
          </span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-wider",
              dedicationStyle[track.nivel_dedicacion]
            )}
          >
            {track.nivel_dedicacion}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {track.duracion_estimada_meses} meses · {track.horas_semanales_objetivo}h/sem
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-fg-primary md:text-4xl">
          {track.titulo}
        </h1>
        {description && (
          <p className="max-w-prose-nied font-serif text-base leading-7 text-fg-secondary">
            {description}
          </p>
        )}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat icon={Target} label="Unidades" value={`${totalUnits}`} />
          <HeroStat icon={Clock} label="Horas" value={`${totalHours}`} />
          <HeroStat
            icon={Zap}
            label="XP"
            value={`${earnedXp}/${totalXp}`}
          />
          <HeroStat label="Avance" value={`${pct}%`} />
        </div>
        <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-bg-overlay">
          <div
            className="absolute inset-y-0 left-0 bg-accent-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      {/* Mapa + sidebar recursos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Mapa de unidades" className="flex flex-col gap-3">
          <h2 className="font-sans text-lg font-semibold text-fg-primary">
            Mapa de unidades
          </h2>
          <div className="flex flex-col gap-2">
            {track.unidades.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                trackId={track.track_id}
                status={trackProgress.get(unit.id) ?? "pendiente"}
              />
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-center gap-2">
              <Library className="size-4 text-accent-primary" strokeWidth={1.8} aria-hidden />
              <h3 className="font-sans text-sm font-semibold text-fg-primary">
                Recursos globales
              </h3>
            </div>
            {recursosMd ? (
              <div className="prose-niED mt-3 text-sm">
                {/* Render directo del markdown crudo como texto plano para evitar
                    re-parseo. Para v0.3 con contenido simple esto basta. */}
                {recursosMd.split(/\n/).map((line, i) => (
                  <p key={i} className="text-xs leading-6 text-fg-secondary">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-fg-muted">
                Este track aún no declara una sección de recursos globales.
              </p>
            )}
          </div>

          {track.proyectos_reales_relacionados.length > 0 && (
            <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <h3 className="font-sans text-sm font-semibold text-fg-primary">
                Proyectos relacionados
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {track.proyectos_reales_relacionados.map((p) => (
                  <li
                    key={p}
                    className="inline-flex items-center rounded-full border border-border bg-bg-overlay/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-secondary"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-bg-overlay/40 px-3 py-2">
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        {Icon && <Icon className="size-3" strokeWidth={1.6} aria-hidden />}
        {label}
      </div>
      <span className="font-mono text-base font-semibold tabular-nums text-fg-primary">
        {value}
      </span>
    </div>
  );
}
