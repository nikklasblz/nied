/**
 * /tracks — grid de los 6 tracks.
 *
 * Server component. Lee frontmatter de todos los SYLLABUS.md y combina con
 * el progreso almacenado en la DB.
 */

import { getAllTracks } from "@/lib/content/loader";
import { getDb } from "@/lib/db/client";
import { getAllProgress } from "@/lib/db/queries/progress";
import { getTotalXpByTrack } from "@/lib/db/queries/xp";
import { TrackCard } from "@/components/track-card";

export const dynamic = "force-dynamic";

export default async function TracksPage() {
  const tracks = await getAllTracks();
  const db = getDb();
  const allProgress = getAllProgress(db);

  const cards = tracks.map((track) => {
    const completed = allProgress.filter(
      (p) => p.track_id === track.track_id && p.status === "completa"
    ).length;
    const totalXp = track.unidades.reduce((acc, u) => acc + u.xp_reward, 0);
    const totalHours = track.unidades.reduce(
      (acc, u) => acc + u.horas_estimadas,
      0
    );
    const earnedXp = getTotalXpByTrack(db, track.track_id);
    return {
      track,
      totalUnits: track.unidades.length,
      completedUnits: completed,
      totalXp,
      earnedXp,
      totalHours,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold text-fg-primary">
          Tracks
        </h1>
        <p className="text-sm text-fg-secondary">
          {tracks.length} tracks · {tracks.reduce((a, t) => a + t.unidades.length, 0)} unidades totales
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <TrackCard key={c.track.track_id} data={c} />
        ))}
      </section>
    </div>
  );
}
