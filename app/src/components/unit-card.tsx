/**
 * UnitCard — usado en el sílabo /tracks/[id].
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UnitMeta } from "@/lib/content/types";
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
  trackId,
  status,
}: {
  unit: UnitMeta;
  trackId: string;
  status: UnitStatus;
}) {
  const num = unit.id.replace(/^u/, "");
  const Icon = statusIcon[status];
  return (
    <Link
      href={`/tracks/${trackId}/${unit.id}`}
      className="group flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-all hover:ring-accent-primary/40 hover:-translate-y-px"
    >
      <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-bg-overlay font-mono text-base font-semibold text-fg-primary">
        u{num}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <h3 className="font-sans text-base font-semibold text-fg-primary group-hover:text-accent-primary">
            {unit.titulo}
          </h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-secondary">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <Clock className="size-3" strokeWidth={1.6} aria-hidden />
            {unit.horas_estimadas}h
          </span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-accent-primary">
            <Zap className="size-3" strokeWidth={1.6} aria-hidden />
            {unit.xp_reward} XP
          </span>
          {unit.dominio && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              {unit.dominio}
            </span>
          )}
        </div>
        {unit.anclaje_sugerido && (
          <div className="mt-1.5 line-clamp-2 text-xs text-fg-muted">
            Anclaje: {unit.anclaje_sugerido}
          </div>
        )}
      </div>
      <div
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
          statusStyle[status]
        )}
      >
        <Icon className="size-3" strokeWidth={1.8} aria-hidden />
        {statusLabel[status]}
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg-primary"
        strokeWidth={1.6}
        aria-hidden
      />
    </Link>
  );
}
