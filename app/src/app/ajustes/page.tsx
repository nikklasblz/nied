/**
 * /ajustes — placeholder v0.5.
 */

import { Settings, Lock } from "@/components/icons";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  return (
    <div className="mx-auto flex w-full max-w-dashboard flex-col gap-4 px-4 py-12 md:px-6">
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-8 ring-1 ring-foreground/10 max-w-prose-nied">
        <div className="grid size-12 place-items-center rounded-lg bg-accent-primary/10 text-accent-primary">
          <Settings className="size-6" strokeWidth={1.6} aria-hidden />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-fg-primary">
          Ajustes
        </h1>
        <p className="font-serif text-base leading-7 text-fg-secondary">
          Preferencias de tema, notificaciones y exportación de datos. Llega
          en v0.5.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-overlay/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
          <Lock className="size-3" strokeWidth={1.8} aria-hidden />
          Disponible en v0.5
        </span>
      </div>
    </div>
  );
}
