"use client";

/**
 * Heatmap GitHub-style — 7 filas × ~53 columnas, 365 días.
 *
 * Cada celda usa la utility `heatmap-cell-{0..4}` (definida en globals.css)
 * sobre `--accent-primary`. Tooltip con shadcn `Tooltip` (base-ui under).
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HeatmapDay } from "@/lib/db/queries/dashboard";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function dayOfWeekMonStart(iso: string): number {
  // 0..6 con lunes=0 para alinear con el visual común.
  const d = new Date(`${iso}T00:00:00`);
  return (d.getDay() + 6) % 7;
}

function formatDateEs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_ES[m - 1]} ${y}`;
}

export function XpHeatmap({ data }: { data: HeatmapDay[] }) {
  if (data.length === 0) return null;

  // Normalizar al lunes anterior al primer día para que la primera columna
  // siempre empiece en lunes (gap superior).
  const firstDow = dayOfWeekMonStart(data[0].date);
  const padded: (HeatmapDay | null)[] = [];
  for (let i = 0; i < firstDow; i++) padded.push(null);
  for (const d of data) padded.push(d);
  // Pad final hasta múltiplo de 7
  while (padded.length % 7 !== 0) padded.push(null);

  const totalCols = padded.length / 7;
  const columns: ((HeatmapDay | null)[])[] = [];
  for (let c = 0; c < totalCols; c++) {
    const col: (HeatmapDay | null)[] = [];
    for (let r = 0; r < 7; r++) col.push(padded[c * 7 + r]);
    columns.push(col);
  }

  // Etiquetas de mes: marcar mes en la primera columna donde aparece.
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  columns.forEach((col, ci) => {
    const firstReal = col.find((c) => c !== null);
    if (!firstReal) return;
    const m = Number(firstReal.date.slice(5, 7));
    if (m !== lastMonth) {
      monthLabels.push({ col: ci, label: MONTHS_ES[m - 1] });
      lastMonth = m;
    }
  });

  const totalXp = data.reduce((acc, d) => acc + d.xp, 0);
  const activeDays = data.filter((d) => d.xp > 0).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="font-sans text-sm font-semibold text-fg-primary">
            Actividad anual
          </h3>
          <span className="font-mono text-xs text-fg-secondary tabular-nums">
            {activeDays} días activos · {totalXp.toLocaleString("es-PE")} XP
          </span>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          {/* Etiquetas de mes */}
          <div
            className="grid h-3 gap-[3px] text-[10px] text-fg-muted"
            style={{
              gridTemplateColumns: `1.25rem repeat(${totalCols}, 11px)`,
            }}
          >
            <div />
            {columns.map((_, ci) => {
              const lbl = monthLabels.find((m) => m.col === ci);
              return (
                <div
                  key={ci}
                  className="font-mono leading-none"
                  style={{ minWidth: 0 }}
                >
                  {lbl ? lbl.label : ""}
                </div>
              );
            })}
          </div>

          {/* Filas: weekday label + columnas */}
          <div className="flex gap-[3px]">
            <div className="flex w-5 flex-col gap-[3px] pr-1">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={i}
                  className="h-[11px] text-right font-mono text-[10px] leading-[11px] text-fg-muted"
                >
                  {i % 2 === 0 ? w : ""}
                </div>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {col.map((cell, ri) => (
                    <Cell key={ri} cell={cell} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ cell }: { cell: HeatmapDay | null }) {
  if (!cell) {
    return <div className="size-[11px]" aria-hidden />;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`Fecha: ${cell.date}, XP: ${cell.xp}`}
            className={`size-[11px] rounded-[2px] heatmap-cell-${cell.level} transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-accent-primary`}
          />
        }
      />
      <TooltipContent>
        <span className="font-mono text-xs">
          {formatDateEs(cell.date)} · {cell.xp} XP
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-fg-muted">
      <span className="font-mono">menos</span>
      <span className="size-[11px] rounded-[2px] heatmap-cell-0" />
      <span className="size-[11px] rounded-[2px] heatmap-cell-1" />
      <span className="size-[11px] rounded-[2px] heatmap-cell-2" />
      <span className="size-[11px] rounded-[2px] heatmap-cell-3" />
      <span className="size-[11px] rounded-[2px] heatmap-cell-4" />
      <span className="font-mono">más</span>
    </div>
  );
}
