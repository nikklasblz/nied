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
  //
  // Design note (a): Only the first cycle is reported by design (fix-and-rerun UX).
  // Reporting all cycles simultaneously is noisy and misleading because fixing one
  // cycle often resolves others; the author re-runs validation after each fix.
  //
  // Design note (b) WARNING: after an early cycle return, nodes on the current DFS
  // path remain in "visiting" state and are never transitioned to "done". Do NOT
  // remove the break below without also resetting those nodes to "white" (unvisited),
  // otherwise subsequent outer-loop iterations would silently skip them and miss cycles.
  const deps = new Map(course.units.map((u) => [u.id, u.depends_on]));
  const state = new Map<string, "visiting" | "done">();

  /**
   * Returns the actual cycle node — the node already in "visiting" state when the
   * back-edge is traversed — or null if no cycle is reachable from `id`.
   * Returning the back-edge target (not the DFS entry point) gives an accurate
   * attribution: the reported node is always a member of the cycle.
   */
  const visit = (id: string): string | null => {
    if (state.get(id) === "visiting") return id; // back-edge: `id` is in the cycle
    if (state.get(id) === "done") return null;
    state.set(id, "visiting");
    for (const dep of deps.get(id) ?? []) {
      // Skip self-deps: phase 2 already reports them as "depends on itself".
      // Including them here would produce a spurious duplicate "cycle" error.
      if (dep === id) continue;
      if (idSet.has(dep)) {
        const cycleNode = visit(dep);
        if (cycleNode !== null) return cycleNode;
      }
    }
    state.set(id, "done");
    return null;
  };

  for (const id of ids) {
    const cycleNode = visit(id);
    if (cycleNode !== null) {
      issues.push({ file, severity: "error", message: `dependency cycle involving ${cycleNode}` });
      break; // Only the first cycle is reported — see design note (a) and WARNING (b) above.
    }
  }

  return issues;
}
