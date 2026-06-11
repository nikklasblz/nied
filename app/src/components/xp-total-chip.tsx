/**
 * Chip compacto con XP total + nivel global. Server component.
 * Se renderiza en la parte inferior del sidebar (persistencia motivacional).
 */
import { getDb } from "@/lib/db/client";
import { getTotalXp } from "@/lib/db/queries/xp";
import { getGlobalLevel } from "@/lib/gamification/levels";
import { Zap } from "@/components/icons";
import { t } from "@/lib/i18n";

export function XPTotalChip() {
  const db = getDb();
  const totalXp = getTotalXp(db);
  const level = getGlobalLevel(totalXp);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-bg-overlay/40 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Zap
          className="size-4 text-accent-primary"
          strokeWidth={1.8}
          aria-hidden
        />
        <span className="font-mono text-sm font-semibold tabular-nums text-fg-primary">
          {totalXp.toLocaleString("es-PE")}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          XP
        </span>
      </div>
      <div className="text-xs text-fg-secondary">
        {t("dashboard.level")}{" "}
        <span className="font-mono text-fg-primary">{level.level}</span> · {level.name}
      </div>
    </div>
  );
}
