import type { CourseMeta, Issue } from "./types";

/** Valida unicidad de ids, existencia de dependencias y ausencia de ciclos. */
export function checkCourseGraph(course: CourseMeta): Issue[] {
  const issues: Issue[] = [];
  const file = "course.yaml";
  const ids = course.units.map((u) => u.id);
  const idSet = new Set(ids);

  if (idSet.size !== ids.length) {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        issues.push({ file, severity: "error", message: `duplicate unit id: ${id}` });
      }
      seen.add(id);
    }
  }

  for (const unit of course.units) {
    for (const dep of unit.depends_on) {
      if (dep === unit.id) {
        issues.push({ file, severity: "error", message: `${unit.id} depends on itself` });
      } else if (!idSet.has(dep)) {
        issues.push({
          file, severity: "error",
          message: `${unit.id} depends on ${dep}, which does not exist`,
        });
      }
    }
  }

  // Detección de ciclos por DFS con colores blanco/gris/negro.
  const deps = new Map(course.units.map((u) => [u.id, u.depends_on]));
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string): boolean => {
    if (state.get(id) === "visiting") return true;
    if (state.get(id) === "done") return false;
    state.set(id, "visiting");
    for (const dep of deps.get(id) ?? []) {
      if (idSet.has(dep) && visit(dep)) return true;
    }
    state.set(id, "done");
    return false;
  };
  for (const id of ids) {
    if (visit(id)) {
      issues.push({ file, severity: "error", message: `dependency cycle involving ${id}` });
      break;
    }
  }

  return issues;
}
