/**
 * /courses — grid de cursos descubiertos en coursesRoot.
 *
 * Server component. Lee course.yaml de cada curso (schema v1) y combina con
 * el progreso almacenado en la DB.
 */

import { listCourses } from "@/lib/content/courses";
import { getDb } from "@/lib/db/client";
import { getAllProgress } from "@/lib/db/queries/progress";
import { getTotalXpByCourse } from "@/lib/db/queries/xp";
import { unitXp } from "@/lib/gamification/xp";
import { CourseCard } from "@/components/course-card";

export const dynamic = "force-dynamic";

export default function CoursesPage() {
  const courses = listCourses();
  const db = getDb();
  const allProgress = getAllProgress(db);

  const cards = courses.map((course) => {
    const completedUnits = allProgress.filter(
      (p) => p.course_id === course.id && p.status === "completa"
    ).length;
    const totalXp = course.meta.units.reduce((acc, u) => acc + unitXp(u), 0);
    const earnedXp = getTotalXpByCourse(db, course.id);
    return { course, completedUnits, totalXp, earnedXp };
  });

  const totalUnits = courses.reduce((a, c) => a + c.meta.units.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold text-fg-primary">
          Cursos
        </h1>
        <p className="text-sm text-fg-secondary">
          {courses.length} cursos · {totalUnits} unidades totales
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <CourseCard key={c.course.id} data={c} />
        ))}
      </section>
    </div>
  );
}
