/**
 * Dashboard — / (server component).
 *
 * Hero "próximo paso" + 3 stat cards (XP / Racha / Nivel) + heatmap 365d
 * + quests v0.5 placeholder + logros recientes.
 */

import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { getDashboardData } from "@/lib/db/queries/dashboard";
import { listCourses } from "@/lib/content/courses";
import { ACHIEVEMENTS } from "@/lib/gamification/achievements";
import { StatCard } from "@/components/stat-card";
import { XpHeatmap } from "@/components/xp-heatmap";
import { AchievementCard } from "@/components/achievement-card";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Flame,
  Trophy,
  Lock,
  ArrowRight,
  Sparkles,
} from "@/components/icons";
import { daysBetween, toIsoDate } from "@/lib/gamification/streaks";

export const dynamic = "force-dynamic";

type NextStep = {
  courseId: string;
  unitId: string;
  unitTitle: string;
  courseTitle: string;
  rationale: string;
};

function computeNextStep(
  progress: { course_id: string; unit_id: string; status: string }[]
): NextStep | null {
  const courses = listCourses();
  if (courses.length === 0) return null;

  // 1) Última unidad en-progreso (si existe y está escrita).
  const inProgress = progress.find((p) => p.status === "en-progreso");
  if (inProgress) {
    const c = courses.find((co) => co.id === inProgress.course_id);
    const u = c?.meta.units.find((x) => x.id === inProgress.unit_id);
    if (c && u && c.writtenUnits.includes(u.id)) {
      return {
        courseId: c.id,
        unitId: u.id,
        unitTitle: u.title,
        courseTitle: c.meta.title,
        rationale: "Continúa donde dejaste",
      };
    }
  }

  // 2) Primer curso con una unidad ESCRITA aún no completada.
  for (const c of courses) {
    const completedIds = new Set(
      progress
        .filter((p) => p.course_id === c.id && p.status === "completa")
        .map((p) => p.unit_id)
    );
    const next = c.meta.units.find(
      (u) => c.writtenUnits.includes(u.id) && !completedIds.has(u.id)
    );
    if (next) {
      return {
        courseId: c.id,
        unitId: next.id,
        unitTitle: next.title,
        courseTitle: c.meta.title,
        rationale:
          progress.length === 0
            ? "Comienza con la primera unidad disponible"
            : "Próxima unidad disponible",
      };
    }
  }

  return null;
}

function levelProgressPct(
  totalXp: number,
  currentReq: number,
  toNext: number | null
): number {
  if (toNext === null) return 100;
  const range = toNext - currentReq;
  if (range <= 0) return 100;
  return Math.min(100, Math.round(((totalXp - currentReq) / range) * 100));
}

export default async function HomePage() {
  const db = getDb();
  const data = getDashboardData(db);
  const next = computeNextStep(data.progress);

  const today = toIsoDate(new Date());
  const daysSince = data.streak.last_activity_date
    ? daysBetween(data.streak.last_activity_date, today)
    : null;
  const streakInDanger =
    data.streak.current > 0 && daysSince !== null && daysSince >= 1;

  const levelPct = levelProgressPct(
    data.totalXp,
    data.level.xpRequired,
    data.level.xpToNext
  );

  // Recent achievements: completar a 5 con bloqueados si hay menos.
  const unlockedSet = new Set(
    data.recentAchievements.map((r) => r.achievement_id)
  );
  const allUnlockedIds = new Set(unlockedSet);
  const recentCards: {
    id: string;
    titulo: string;
    descripcion: string;
    icon: string;
    unlocked: boolean;
    unlockedAt: string | null;
  }[] = [];
  for (const r of data.recentAchievements) {
    const meta = ACHIEVEMENTS.find((a) => a.id === r.achievement_id);
    if (!meta) continue;
    recentCards.push({
      id: meta.id,
      titulo: meta.titulo,
      descripcion: meta.descripcion,
      icon: meta.icon,
      unlocked: true,
      unlockedAt: r.unlocked_at,
    });
  }
  for (const a of ACHIEVEMENTS) {
    if (recentCards.length >= 5) break;
    if (allUnlockedIds.has(a.id)) continue;
    recentCards.push({
      id: a.id,
      titulo: a.titulo,
      descripcion: a.descripcion,
      icon: a.icon,
      unlocked: false,
      unlockedAt: null,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-8 px-4 py-8 md:px-6">
      {/* Hero — próximo paso */}
      <section
        aria-label="Próximo paso"
        className="relative overflow-hidden rounded-2xl bg-card p-6 ring-1 ring-accent-primary/25 md:p-8"
      >
        <div className="absolute right-0 top-0 size-64 -translate-y-1/3 translate-x-1/4 rounded-full bg-accent-primary/8 blur-3xl" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-primary">
            <Sparkles className="size-3.5" strokeWidth={2} aria-hidden />
            Próximo paso
          </div>
          {next ? (
            <>
              <div>
                <p className="text-sm text-fg-secondary">{next.rationale}</p>
                <h1 className="mt-1 font-serif text-2xl font-semibold text-fg-primary md:text-3xl">
                  {next.unitTitle}
                </h1>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider text-fg-muted">
                  {next.courseId} · {next.courseTitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  render={
                    <Link
                      href={`/courses/${next.courseId}/${next.unitId}`}
                    />
                  }
                >
                  Continuar
                  <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  render={<Link href={`/courses/${next.courseId}`} />}
                >
                  Ver sílabo del curso
                </Button>
              </div>
            </>
          ) : (
            <div>
              <h1 className="font-serif text-2xl font-semibold text-fg-primary md:text-3xl">
                Todo al día. Buen trabajo.
              </h1>
              <p className="mt-1 text-sm text-fg-secondary">
                No hay unidades pendientes — explora los cursos o registra una
                entrada en tu bitácora.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stat cards */}
      <section
        aria-label="Estadísticas"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          label="XP total"
          value={data.totalXp.toLocaleString("es-PE")}
          unit="XP"
          icon={Zap}
          iconColor="primary"
          accent="primary"
          description={
            <span>
              Nivel <span className="font-mono text-fg-primary">{data.level.level}</span> · {data.level.name}
            </span>
          }
          footer={
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-fg-muted">
                <span>al siguiente</span>
                <span>
                  {data.level.xpToNext === null
                    ? "máximo"
                    : `${(data.level.xpToNext - data.totalXp).toLocaleString("es-PE")} XP`}
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-bg-overlay ring-1 ring-accent-primary/20">
                <div
                  className="absolute inset-y-0 left-0 bg-accent-primary transition-[width] duration-300"
                  style={{ width: `${levelPct}%` }}
                />
              </div>
            </div>
          }
        />
        <StatCard
          label="Racha"
          value={data.streak.current}
          unit={data.streak.current === 1 ? "día" : "días"}
          icon={Flame}
          iconColor={streakInDanger ? "warning" : "secondary"}
          accent={streakInDanger ? "warning" : "secondary"}
          warning={streakInDanger}
          description={
            <span>
              Multiplicador{" "}
              <span className="font-mono text-fg-primary">
                ×{data.streak.multiplier}
              </span>
              {" · "}
              récord{" "}
              <span className="font-mono text-fg-primary">
                {data.streak.longest}
              </span>
            </span>
          }
          footer={
            streakInDanger ? (
              <span className="text-xs text-warning">
                Activa hoy para mantener tu racha.
              </span>
            ) : undefined
          }
        />
        <StatCard
          label="Nivel"
          value={`N${data.level.level}`}
          icon={Trophy}
          iconColor="primary"
          accent="primary"
          description={
            <span className="font-sans text-base font-semibold text-fg-primary">
              {data.level.name}
            </span>
          }
          footer={
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-fg-muted">
                <span>progreso</span>
                <span>{levelPct}%</span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-bg-overlay">
                <div
                  className="absolute inset-y-0 left-0 bg-accent-primary"
                  style={{ width: `${levelPct}%` }}
                />
              </div>
            </div>
          }
        />
      </section>

      {/* Heatmap */}
      <section
        aria-label="Heatmap de actividad"
        className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 shadow-card"
      >
        <XpHeatmap data={data.heatmap} />
      </section>

      {/* Quests + Logros recientes */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-fg-muted" strokeWidth={1.8} aria-hidden />
            <h3 className="font-sans text-sm font-semibold text-fg-primary">
              Quests semanales
            </h3>
          </div>
          <p className="mt-2 text-xs text-fg-secondary">
            Disponibles en v0.5. Las quests dirigirán bloques cortos de estudio
            con bonus de XP y badges temporales.
          </p>
          <span className="mt-3 inline-flex items-center rounded-full border border-border bg-bg-overlay/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            Próximamente
          </span>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-sans text-sm font-semibold text-fg-primary">
              Logros recientes
            </h3>
            <Link
              href="/logros"
              className="font-mono text-[10px] uppercase tracking-wider text-fg-secondary hover:text-fg-primary"
            >
              ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentCards.map((c) => (
              <AchievementCard
                key={c.id}
                titulo={c.titulo}
                descripcion={c.descripcion}
                icon={c.icon}
                unlocked={c.unlocked}
                unlockedAt={c.unlockedAt}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
