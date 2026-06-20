/**
 * /review — repaso espaciado (SRS Leitner).
 *
 * Server component: carga las cards vencidas (getDueCardViews) y delega
 * la interacción al client component ReviewDeck (labels por props).
 */

import { getDueCardViews } from "@/app/actions/srs";
import { ReviewDeck } from "@/components/review-deck";
import { CheckCircle2 } from "@/components/icons";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const cards = await getDueCardViews();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold text-fg-primary">
          {t("review.title")}
        </h1>
        <p className="text-sm text-fg-secondary">
          <span className="font-mono tabular-nums">{cards.length}</span>{" "}
          {t("review.due")}
        </p>
      </header>

      {cards.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-5 py-5">
          <CheckCircle2
            className="size-5 shrink-0 text-success"
            strokeWidth={2}
            aria-hidden
          />
          <p className="text-sm text-fg-secondary">{t("review.empty")}</p>
        </div>
      ) : (
        <ReviewDeck
          cards={cards}
          labels={{
            show: t("review.show"),
            correct: t("review.correct"),
            wrong: t("review.wrong"),
            empty: t("review.empty"),
            box: t("review.box"),
            answer: t("review.answer"),
          }}
        />
      )}
    </div>
  );
}
