"use client";

/**
 * Botón "Marcar como completa" — client component.
 *
 * Llama el server action `markUnitComplete`, dispara toasts de XP gain y
 * de logros desbloqueados via sonner + framer-motion.
 */

import { useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import * as Lucide from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  markUnitComplete,
  unmarkUnitComplete,
} from "@/app/actions/unit";
import { Check, Trophy, Zap } from "@/components/icons";

type Status = "pendiente" | "en-progreso" | "completa";

export function MarkCompleteButton({
  courseId,
  unitId,
  status,
  completedAt,
}: {
  courseId: string;
  unitId: string;
  status: Status;
  completedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (status === "completa") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-success">
          <Check className="size-5" strokeWidth={2} aria-hidden />
          <span className="font-sans text-sm font-medium">
            Completada
            {completedAt ? ` · ${formatCompletedAt(completedAt)}` : ""}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await unmarkUnitComplete(courseId, unitId);
              if (r.ok) {
                toast.message("Unidad marcada como pendiente", {
                  description:
                    "El XP ya otorgado se conserva en el historial.",
                });
              }
            })
          }
        >
          Desmarcar
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="default"
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markUnitComplete(courseId, unitId);
          if (!result.ok) {
            toast.error("No se pudo marcar la unidad", {
              description: result.error,
            });
            return;
          }
          // XP gain toast
          toast.custom(
            () => <XpGainToast xp={result.xpAwarded} multiplier={result.multiplier} />,
            { duration: 2800 }
          );
          // Achievement toasts (encadenados con leve delay).
          result.newAchievements.forEach((a, idx) => {
            window.setTimeout(() => {
              toast.custom(
                () => (
                  <AchievementToast
                    titulo={a.titulo}
                    descripcion={a.descripcion}
                    iconName={a.icon}
                  />
                ),
                { duration: 4200 }
              );
            }, 700 + idx * 600);
          });
        })
      }
      className="w-full sm:w-auto"
    >
      <Check className="size-4" strokeWidth={2} aria-hidden />
      Marcar como completa
    </Button>
  );
}

function formatCompletedAt(iso: string): string {
  // Formato sqlite: "YYYY-MM-DD HH:MM:SS" en UTC.
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function XpGainToast({ xp, multiplier }: { xp: number; multiplier: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-xl border border-accent-primary/40 bg-popover px-4 py-3 shadow-xp-glow"
    >
      <Zap
        className="size-5 text-accent-primary"
        strokeWidth={2}
        aria-hidden
      />
      <div className="flex flex-col">
        <span className="font-mono text-base font-semibold tabular-nums text-accent-primary">
          +{xp} XP
        </span>
        {multiplier > 1.0 && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-secondary">
            multiplicador ×{multiplier}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lucideMap = Lucide as unknown as Record<string, any>;

function LucideIcon({
  name,
  className,
  strokeWidth,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon =
    (lucideMap[name] as React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined) ??
    (Trophy as React.ComponentType<React.SVGProps<SVGSVGElement>>);
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}

function AchievementToast({
  titulo,
  descripcion,
  iconName,
}: {
  titulo: string;
  descripcion: string;
  iconName: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-start gap-3 rounded-xl border border-accent-primary/40 bg-popover px-4 py-3 shadow-xp-glow"
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-primary/15 text-accent-primary">
        <LucideIcon name={iconName} className="size-5" strokeWidth={1.8} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <Trophy
            className="size-3 text-accent-primary"
            strokeWidth={2}
            aria-hidden
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-accent-primary">
            Logro desbloqueado
          </span>
        </div>
        <span className="font-sans text-sm font-semibold text-fg-primary">
          {titulo}
        </span>
        <span className="text-xs text-fg-secondary">{descripcion}</span>
      </div>
    </motion.div>
  );
}
