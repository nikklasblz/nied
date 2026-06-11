/**
 * /courses/[id] — sílabo de un curso (schema v1).
 *
 * Hero con título + nivel, stats agregadas y mapa de unidades vertical.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/content/courses";
import { getDb } from "@/lib/db/client";
import { getAllProgress } from "@/lib/db/queries/progress";
import { getTotalXpByCourse } from "@/lib/db/queries/xp";
import { unitXp } from "@/lib/gamification/xp";
import { UnitCard, type UnitStatus } from "@/components/unit-card";
import { levelLabel, levelStyle } from "@/components/course-card";
import { ChevronLeft, Clock, Zap, Target } from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = getCourse(id);
  if (!course) notFound();

  const db = getDb();
  const allProgress = getAllProgress(db);
  const courseProgress = new Map(
    allProgress
      .filter((p) => p.course_id === course.id)
      .map((p) => [p.unit_id, p.status as UnitStatus])
  );
  const written = new Set(course.writtenUnits);

  const totalUnits = course.meta.units.length;
  const completedUnits = Array.from(courseProgress.values()).filter(
    (s) => s === "completa"
  ).length;
  const totalXp = course.meta.units.reduce((a, u) => a + unitXp(u), 0);
  const earnedXp = getTotalXpByCourse(db, course.id);
  const pct =
    totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
      <Link
        href="/courses"
        className="inline-flex w-fit items-center gap-1 text-xs text-fg-secondary hover:text-fg-primary"
      >
        <ChevronLeft className="size-3.5" strokeWidth={1.6} aria-hidden />
        Volver a cursos
      </Link>

      {/* Hero */}
      <header className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10 md:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            {course.id}
          </span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-wider",
              levelStyle[course.meta.level]
            )}
          >
            {levelLabel[course.meta.level]}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {course.meta.language} · {course.writtenUnits.length}/{totalUnits} unidades disponibles
          </span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-fg-primary md:text-4xl">
          {course.meta.title}
        </h1>
        {course.meta.description && (
          <p className="max-w-prose-nied font-serif text-base leading-7 text-fg-secondary">
            {course.meta.description}
          </p>
        )}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat icon={Target} label="Unidades" value={`${totalUnits}`} />
          <HeroStat icon={Clock} label="Horas" value={`${course.totalHours}`} />
          <HeroStat icon={Zap} label="XP" value={`${earnedXp}/${totalXp}`} />
          <HeroStat label="Avance" value={`${pct}%`} />
        </div>
        <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-bg-overlay">
          <div
            className="absolute inset-y-0 left-0 bg-accent-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      {/* Mapa de unidades */}
      <section aria-label="Mapa de unidades" className="flex flex-col gap-3">
        <h2 className="font-sans text-lg font-semibold text-fg-primary">
          Mapa de unidades
        </h2>
        <div className="flex flex-col gap-2">
          {course.meta.units.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              courseId={course.id}
              status={courseProgress.get(unit.id) ?? "pendiente"}
              xp={unitXp(unit)}
              written={written.has(unit.id)}
            />
          ))}
        </div>
      </section>
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
