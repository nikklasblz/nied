/**
 * StatCard genérico — usado en el dashboard para XP, racha y nivel.
 */
import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode, SVGProps } from "react";

export type StatCardProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  description?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor?: "primary" | "secondary" | "warning" | "muted";
  accent?: "primary" | "secondary" | "warning" | "neutral";
  warning?: boolean;
  footer?: ReactNode;
  className?: string;
};

const iconColorMap = {
  primary: "text-accent-primary",
  secondary: "text-accent-secondary",
  warning: "text-warning",
  muted: "text-fg-muted",
} as const;

const accentRingMap = {
  primary: "ring-accent-primary/20",
  secondary: "ring-accent-secondary/20",
  warning: "ring-warning/40",
  neutral: "ring-foreground/10",
} as const;

export function StatCard({
  label,
  value,
  unit,
  description,
  icon: Icon,
  iconColor = "primary",
  accent = "neutral",
  warning,
  footer,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-card p-5 shadow-card ring-1",
        warning ? "ring-warning/40 streak-warning-pulse" : accentRingMap[accent],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-secondary">
          {label}
        </span>
        {Icon && (
          <Icon
            className={cn("size-5", iconColorMap[iconColor])}
            strokeWidth={1.8}
            aria-hidden
          />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-4xl font-semibold leading-none tabular-nums",
            warning ? "text-warning" : "text-fg-primary"
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs uppercase tracking-wider text-fg-secondary">
            {unit}
          </span>
        )}
      </div>
      {description && (
        <div className="text-sm text-fg-secondary">{description}</div>
      )}
      {footer && <div className="pt-1">{footer}</div>}
    </div>
  );
}
