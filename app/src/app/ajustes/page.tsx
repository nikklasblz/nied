/**
 * /ajustes — preferencias de la instancia.
 */

import { Settings } from "@/components/icons";
import { ReadingSettings } from "@/components/reading-settings";
import type { ReadingControlsLabels } from "@/components/reading-controls";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  const labels: ReadingControlsLabels = {
    enable: t("reading.enable"),
    granularity: t("reading.granularity"),
    granLetter: t("reading.gran.letter"),
    granWord: t("reading.gran.word"),
    granSentence: t("reading.gran.sentence"),
    style: t("reading.style"),
    styleContainer: t("reading.style.container"),
    styleLine: t("reading.style.line"),
    styleGlow: t("reading.style.glow"),
    color: t("reading.color"),
    colorAccent: t("reading.colorAccent"),
    colorLine: t("reading.colorLine"),
    speed: t("reading.speed"),
    speedUnit: t("reading.speedUnit"),
  };

  return (
    <div className="mx-auto flex w-full max-w-reading flex-col gap-4 px-4 py-12 md:px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-lg bg-accent-primary/10 text-accent-primary">
          <Settings className="size-6" strokeWidth={1.6} aria-hidden />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-fg-primary">
          {t("nav.settings")}
        </h1>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        <h2 className="font-serif text-lg font-semibold text-fg-primary">
          {t("settings.readingTitle")}
        </h2>
        <p className="text-sm leading-6 text-fg-secondary">
          {t("settings.readingDesc")}
        </p>
        <ReadingSettings labels={labels} />
      </section>
    </div>
  );
}
