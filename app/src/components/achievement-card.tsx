/**
 * AchievementCard — usado en /logros y dashboard.
 *
 * Estado bloqueado vs desbloqueado se diferencia con color, glow y badge.
 */
import { cn } from "@/lib/utils";
import * as Lucide from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { t } from "@/lib/i18n";

export type AchievementCardProps = {
  icon: string; // nombre Lucide ej "Flame"
  titulo: string;
  descripcion: string;
  unlocked: boolean;
  unlockedAt?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lucideMap = Lucide as unknown as Record<string, any>;

function LucideIconByName({
  name,
  className,
  strokeWidth,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Comp =
    (lucideMap[name] as ComponentType<SVGProps<SVGSVGElement>> | undefined) ??
    (Lucide.Award as ComponentType<SVGProps<SVGSVGElement>>);
  return <Comp className={className} strokeWidth={strokeWidth} aria-hidden />;
}

function formatDate(iso: string): string {
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AchievementCard({
  icon,
  titulo,
  descripcion,
  unlocked,
  unlockedAt,
}: AchievementCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl bg-card p-4 ring-1 transition-all",
        unlocked
          ? "ring-accent-primary/35 shadow-card"
          : "ring-foreground/10 opacity-80"
      )}
    >
      <div
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-lg",
          unlocked
            ? "bg-accent-primary/12 text-accent-primary shadow-xp-glow"
            : "bg-bg-overlay text-fg-muted"
        )}
      >
        <LucideIconByName name={icon} className="size-6" strokeWidth={1.6} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4
            className={cn(
              "font-sans text-sm font-semibold",
              unlocked ? "text-fg-primary" : "text-fg-secondary"
            )}
          >
            {titulo}
          </h4>
          {unlocked && (
            <span className="inline-flex h-4 items-center rounded-full bg-accent-primary px-1.5 font-mono text-[9px] uppercase tracking-wider text-primary-foreground">
              {t("achievements.obtained")}
            </span>
          )}
        </div>
        <p
          className={cn(
            "mt-1 text-xs leading-snug",
            unlocked ? "text-fg-secondary" : "text-fg-muted"
          )}
        >
          {descripcion}
        </p>
        {unlocked && unlockedAt && (
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {t("achievements.unlockedAt")} · {formatDate(unlockedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
