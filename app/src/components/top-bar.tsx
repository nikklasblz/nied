/**
 * Top bar del app shell (server component).
 *
 * Lee racha + nivel desde la DB y los muestra a la derecha. A la izquierda
 * incluye el trigger del Sheet drawer en mobile.
 */

import { getDb } from "@/lib/db/client";
import { getTotalXp } from "@/lib/db/queries/xp";
import { getStreak } from "@/lib/db/queries/streaks";
import { getGlobalLevel } from "@/lib/gamification/levels";
import {
  getMultiplierForStreak,
  daysBetween,
  toIsoDate,
} from "@/lib/gamification/streaks";
import { MobileNavTrigger } from "@/components/mobile-nav-trigger";
import { getNavLabels, getReviewDueCount } from "@/components/app-shell";
import { Flame, Trophy } from "@/components/icons";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TopBar() {
  const db = getDb();
  const totalXp = getTotalXp(db);
  const level = getGlobalLevel(totalXp);
  const streak = getStreak(db);
  const multiplier = getMultiplierForStreak(streak.current_streak);

  const today = toIsoDate(new Date());
  const daysSinceLastActivity = streak.last_activity_date
    ? daysBetween(streak.last_activity_date, today)
    : null;
  const streakActive = streak.current_streak > 0;
  // Heurística simple: si último día fue ayer y ya pasaron muchas horas, está "en peligro".
  // Sin hora exacta usamos: racha activa con last_activity_date = ayer → en peligro.
  const inDanger =
    streakActive && daysSinceLastActivity !== null && daysSinceLastActivity >= 1;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg-base/85 px-4 backdrop-blur-md md:px-6">
      <MobileNavTrigger
        openLabel={t("nav.open")}
        navLabels={getNavLabels()}
        reviewDue={getReviewDueCount()}
      />
      <div className="flex flex-1 items-center">
        <span className="font-sans text-sm font-medium text-fg-secondary">
          {t("topbar.tagline")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <StreakBadge
          current={streak.current_streak}
          multiplier={multiplier}
          inDanger={inDanger}
        />
        <LevelBadge level={level.level} name={level.name} />
      </div>
    </header>
  );
}

function StreakBadge({
  current,
  multiplier,
  inDanger,
}: {
  current: number;
  multiplier: number;
  inDanger: boolean;
}) {
  const lost = current === 0;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        lost
          ? "border-border bg-bg-overlay/40 text-fg-muted"
          : inDanger
            ? "border-warning/50 bg-warning/10 text-warning streak-warning-pulse"
            : "border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary"
      )}
      aria-label={
        lost
          ? t("topbar.streakInactive")
          : t("topbar.streakAria")
              .replace("{current}", String(current))
              .replace("{multiplier}", String(multiplier))
      }
    >
      <Flame
        className={cn("size-3.5", lost && "opacity-50")}
        strokeWidth={1.8}
        aria-hidden
      />
      <span className="font-mono text-xs font-semibold tabular-nums">
        {current}
      </span>
      {!lost && (
        <span className="font-mono text-[10px] opacity-80">×{multiplier}</span>
      )}
    </div>
  );
}

function LevelBadge({ level, name }: { level: number; name: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2.5 py-1 text-accent-primary"
      aria-label={t("topbar.levelAria")
        .replace("{level}", String(level))
        .replace("{name}", name)}
    >
      <Trophy className="size-3.5" strokeWidth={1.8} aria-hidden />
      <span className="font-mono text-xs font-semibold tabular-nums">
        N{level}
      </span>
      <span className="hidden font-sans text-xs sm:inline">{name}</span>
    </div>
  );
}
