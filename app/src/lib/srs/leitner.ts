/** Leitner clásico de 5 cajas. Caja N se repasa cada BOX_INTERVALS_DAYS[N-1] días. */
export const BOX_INTERVALS_DAYS = [1, 2, 4, 8, 16] as const;

export function gradeCard(box: number, correct: boolean): number {
  return correct ? Math.min(box + 1, 5) : 1;
}

export function nextDueDate(box: number, fromIsoDate: string): string {
  const days = BOX_INTERVALS_DAYS[Math.min(Math.max(box, 1), 5) - 1]!;
  const d = new Date(`${fromIsoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
