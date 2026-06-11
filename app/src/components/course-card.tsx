/**
 * CourseCard — usado en /courses (grid). Server component: usa t() directo.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CourseMeta } from "@nied/schema";
import type { CourseEntry } from "@/lib/content/types";
import { Clock, Zap, Target } from "@/components/icons";
import { t } from "@/lib/i18n";

export type CourseLevel = CourseMeta["level"];

export type CourseCardData = {
  course: CourseEntry;
  completedUnits: number;
  totalXp: number;
  earnedXp: number;
};

export const levelStyle: Record<CourseLevel, string> = {
  intro: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  intermediate: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  advanced: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

/** Label traducido del nivel de un curso (server-side). */
export function levelLabel(level: CourseLevel): string {
  return t(`course.level.${level}`);
}

export function CourseCard({ data }: { data: CourseCardData }) {
  const { course, completedUnits, totalXp, earnedXp } = data;
  const totalUnits = course.meta.units.length;
  const writtenUnits = course.writtenUnits.length;
  const pct =
    totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group relative flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/10 transition-all hover:ring-accent-primary/40 hover:-translate-y-px focus-visible:ring-accent-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            {course.id}
          </div>
          <h3 className="mt-1 font-serif text-xl font-semibold leading-tight text-fg-primary">
            {course.meta.title}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex h-5 shrink-0 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-wider",
            levelStyle[course.meta.level]
          )}
        >
          {levelLabel(course.meta.level)}
        </span>
      </div>

      {course.meta.description && (
        <p className="line-clamp-2 text-xs leading-5 text-fg-secondary">
          {course.meta.description}
        </p>
      )}

      {/* progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-fg-secondary">
          <span>
            {completedUnits} / {totalUnits} {t("course.units")}
            {writtenUnits < totalUnits && (
              <span className="text-fg-muted">
                {" "}
                · {writtenUnits} {t("course.available")}
              </span>
            )}
          </span>
          <span className="font-mono tabular-nums">{pct}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-bg-overlay">
          <div
            className="absolute inset-y-0 left-0 bg-accent-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* stats footer */}
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
        <Stat icon={Target} label={t("course.units")} value={`${totalUnits}`} />
        <Stat icon={Clock} label={t("course.hours")} value={`${course.totalHours}`} />
        <Stat icon={Zap} label="XP" value={`${earnedXp}/${totalXp}`} />
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-fg-muted">
        <Icon className="size-3" strokeWidth={1.6} aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="font-mono text-sm tabular-nums text-fg-primary">
        {value}
      </span>
    </div>
  );
}
