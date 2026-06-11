/**
 * /logros — grid de los 10 logros core.
 */

import { getDb } from "@/lib/db/client";
import { getAchievementsState } from "@/lib/gamification/achievements";
import { listUnlocked } from "@/lib/db/queries/achievements";
import { AchievementCard } from "@/components/achievement-card";

export const dynamic = "force-dynamic";

export default function LogrosPage() {
  const db = getDb();
  const list = getAchievementsState(db);
  const unlockedRows = listUnlocked(db);
  const unlockedAtById = new Map(
    unlockedRows.map((r) => [r.achievement_id, r.unlocked_at])
  );
  const unlockedCount = list.filter((x) => x.unlocked).length;
  const total = list.length;
  const pct = total === 0 ? 0 : Math.round((unlockedCount / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold text-fg-primary">
          Logros
        </h1>
        <p className="text-sm text-fg-secondary">
          {unlockedCount} de {total} desbloqueados
        </p>
        <div className="relative mt-1 h-2 max-w-md overflow-hidden rounded-full bg-bg-overlay">
          <div
            className="absolute inset-y-0 left-0 bg-accent-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ achievement, unlocked }) => (
          <AchievementCard
            key={achievement.id}
            titulo={achievement.titulo}
            descripcion={achievement.descripcion}
            icon={achievement.icon}
            unlocked={unlocked}
            unlockedAt={unlockedAtById.get(achievement.id) ?? null}
          />
        ))}
      </section>
    </div>
  );
}
