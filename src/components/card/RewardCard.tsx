import { IconGift } from "@/components/ui/Icons";

import type { PublicCardData } from "@/lib/card/types";

const numberFmt = new Intl.NumberFormat("pt-BR");

const REWARD_TYPE_LABEL: Record<PublicCardData["rewards"][number]["type"], string> = {
  FREE_ITEM: "Item grátis",
  DISCOUNT: "Desconto",
  CASHBACK: "Cashback",
  CUSTOM: "Recompensa",
};

/** Métrica de progresso relevante para comparar com `reward.threshold`. */
function progressValue(
  program: PublicCardData["program"],
  membership: PublicCardData["membership"],
): number {
  switch (program.type) {
    case "STAMP":
      return membership.stamps;
    case "VISIT":
      return membership.visits;
    case "POINTS":
    case "TIER":
      return membership.points;
    case "CUSTOM":
    default:
      return Math.max(membership.points, membership.stamps, membership.visits);
  }
}

/**
 * Recompensa disponível/próxima — nunca um resgate funcional (o motor de
 * fidelidade é etapa futura). Quando disponível, orienta o cliente a
 * mostrar o cartão à equipe; não existe botão que credite ou debite nada.
 */
export function RewardCard({
  rewards,
  program,
  membership,
}: {
  rewards: PublicCardData["rewards"];
  program: PublicCardData["program"];
  membership: PublicCardData["membership"];
}) {
  if (rewards.length === 0) {
    return null;
  }

  const progress = progressValue(program, membership);
  const sorted = [...rewards].sort((a, b) => a.threshold - b.threshold);
  const available = [...sorted]
    .reverse()
    .find((reward) => progress >= reward.threshold);
  const next = sorted.find((reward) => progress < reward.threshold);

  return (
    <section
      className={[
        "rounded-2xl border bg-white p-5 shadow-sm shadow-brand-950/[0.03] group-data-[card-style=bold]/card:shadow-md group-data-[card-style=bold]/card:shadow-brand-950/[0.06] group-data-[card-style=minimal]/card:shadow-none",
        available
          ? "border-(--accent)/25 ring-1 ring-inset ring-(--accent)/10"
          : "border-line",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            available
              ? "bg-(--accent) text-white shadow-md shadow-(--accent)/30"
              : "bg-(--accent)/10 text-(--accent)",
          ].join(" ")}
        >
          <IconGift className="h-[1.1rem] w-[1.1rem]" />
        </span>
        <h2 className="font-display text-base font-semibold text-ink group-data-[card-style=bold]/card:text-lg">
          {available ? "Sua recompensa" : "Próxima recompensa"}
        </h2>
      </div>

      {available ? (
        <div className="mt-4 animate-reward-glow rounded-xl bg-(--accent)/[0.07] p-4 ring-1 ring-inset ring-(--accent)/15 [animation-delay:420ms] motion-reduce:animate-none">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-(--accent) px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
            <span aria-hidden="true">✦</span>
            Disponível agora
          </p>
          <p className="mt-2 font-display text-lg font-bold leading-tight text-ink group-data-[card-style=bold]/card:text-xl">
            {available.name}
          </p>
          {available.description ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {available.description}
            </p>
          ) : null}
          <p className="mt-3 border-t border-(--accent)/15 pt-3 text-xs font-medium text-ink-muted">
            Mostre este cartão à equipe do estabelecimento para resgatar.
          </p>
        </div>
      ) : null}

      {next ? (
        <div
          className={
            available
              ? "mt-3 border-t border-line pt-3"
              : "mt-4 rounded-xl bg-(--accent)/[0.05] p-4 ring-1 ring-inset ring-(--accent)/10 group-data-[card-style=minimal]/card:bg-transparent group-data-[card-style=minimal]/card:ring-line"
          }
        >
          <p className="text-sm text-ink-soft">
            Faltam{" "}
            <span className="font-bold text-(--accent) tabular-nums">
              {numberFmt.format(Math.max(0, next.threshold - progress))}
            </span>{" "}
            para{" "}
            <span className="font-semibold text-ink">{next.name}</span>
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {REWARD_TYPE_LABEL[next.type]}
            {next.description ? ` · ${next.description}` : ""}
          </p>
        </div>
      ) : null}

      {!available && !next ? (
        <p className="mt-4 text-sm text-ink-muted">
          Nenhuma recompensa disponível no momento.
        </p>
      ) : null}
    </section>
  );
}
