/**
 * UnitCard — usado en el sílabo /courses/[id].
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UnitMeta } from "@nied/schema";
import { Clock, Zap, ChevronRight, CheckCircle2, Circle, CircleDot } from "@/components/icons";

export type UnitStatus = "pendiente" | "en-progreso" | "completa";

const statusStyle: Record<UnitStatus, string> = {
  pendiente: "border-border bg-bg-overlay/40 text-fg-secondary",
  "en-progreso":
    "border-accent-secondary/40 bg-accent-secondary/10 text-accent-secondary",
  completa:
    "border-success/40 bg-success/10 text-success",
};

const statusLabel: Record<UnitStatus, string> = {
  pendiente: "Pendiente",
  "en-progreso": "En progreso",
  completa: "Completa",
};

const statusIcon: Record<UnitStatus, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  pendiente: Circle,
  "en-progreso": CircleDot,
  completa: CheckCircle2,
};

export function UnitCard({
  unit,
  courseId,
  status,
  xp,
  written,
}: {
  unit: UnitMeta;
  courseId: string;
  status: UnitStatus;
  xp: number;
  written: boolean;
}) {
  const num = unit.id.replace(/^u/, "");
  const Icon = statusIcon[status];

  const body = (
    <>
      <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-bg-overlay font-mono text-base font-semibold text-fg-primary">
        u{num}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <h3
            className={cn(
              "font-sans text-base font-semibold text-fg-primary",
              written && "group-hover:text-accent-primary"
            )}
          >
            {unit.title}
          </h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-secondary">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Clock className="size-3" strokeWidth={1.6} aria-hidden />
            {unit.hours}h
          </span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-accent-primary">
            <Zap className="size-3" strokeWidth={1.6} aria-hidden />
            {xp} XP
          </span>
          {unit.depends_on.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              Requiere: {unit.depends_on.join(", ")}
            </span>
          )}
        </div>
        {unit.objectives[0] && (
          <div className="mt-1.5 line-clamp-2 text-xs text-fg-muted">
            {unit.objectives[0]}
          </div>
        )}
      </div>
      {written ? (
        <div
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
            statusStyle[status]
          )}
        >
          <Icon className="size-3" strokeWidth={1.8} aria-hidden />
          {statusLabel[status]}
        </div>
      ) : (
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-bg-overlay/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <Circle className="size-3" strokeWidth={1.8} aria-hidden />
          Pendiente de generar
        </div>
      )}
      <ChevronRight
        className={cn(
          "size-4 shrink-0 text-fg-muted",
          written && "transition-transform group-hover:translate-x-0.5 group-hover:text-fg-primary"
        )}
        strokeWidth={1.6}
        aria-hidden
      />
    </>
  );

  if (!written) {
    return (
      <div
        aria-disabled
        className="flex items-center gap-4 rounded-xl bg-card p-4 opacity-60 ring-1 ring-foreground/10"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/courses/${courseId}/${unit.id}`}
      className="group flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:ring-accent-primary/40 hover:-translate-y-px"
    >
      {body}
    </Link>
  );
}
