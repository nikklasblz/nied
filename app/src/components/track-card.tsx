/**
 * TrackCard — usado en /tracks (grid).
 */
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NivelDedicacion, Track } from "@/lib/content/types";
import { Clock, Zap, Target } from "@/components/icons";

export type TrackCardData = {
  track: Track;
  totalUnits: number;
  completedUnits: number;
  totalXp: number;
  earnedXp: number;
  totalHours: number;
};

const dedicationStyle: Record<NivelDedicacion, string> = {
  ligero:
    "border-foreground/15 bg-foreground/5 text-fg-secondary",
  sostenido:
    "border-accent-primary/30 bg-accent-primary/10 text-accent-primary",
  intensivo:
    "border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary",
};

const dedicationLabel: Record<NivelDedicacion, string> = {
  ligero: "Ligero",
  sostenido: "Sostenido",
  intensivo: "Intensivo",
};

export function TrackCard({ data }: { data: TrackCardData }) {
  const { track, totalUnits, completedUnits, totalXp, earnedXp, totalHours } =
    data;
  const pct =
    totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

  return (
    <Link
      href={`/tracks/${track.track_id}`}
      className="group relative flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/10 transition-all hover:ring-accent-primary/40 hover:-translate-y-px focus-visible:ring-accent-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            {track.track_id}
          </div>
          <h3 className="mt-1 font-serif text-xl font-semibold leading-tight text-fg-primary">
            {track.titulo}
          </h3>
        </div>
        <span
          className={cn(
            "inline-flex h-5 shrink-0 items-center rounded-full border px-2 font-mono text-[10px] uppercase tracking-wider",
            dedicationStyle[track.nivel_dedicacion]
          )}
        >
          {dedicationLabel[track.nivel_dedicacion]}
        </span>
      </div>

      {/* progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-fg-secondary">
          <span>
            {completedUnits} / {totalUnits} unidades
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
        <Stat
          icon={Target}
          label="Unidades"
          value={`${totalUnits}`}
        />
        <Stat
          icon={Clock}
          label="Horas"
          value={`${totalHours}`}
        />
        <Stat
          icon={Zap}
          label="XP"
          value={`${earnedXp}/${totalXp}`}
        />
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
