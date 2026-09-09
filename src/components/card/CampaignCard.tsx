import { IconMegaphone } from "@/components/ui/Icons";

import type { PublicCardData } from "@/lib/card/types";

/**
 * Uma campanha visível no cartão. Só chegam aqui campanhas já aprovadas
 * (`status = 'ACTIVE'`) com mensagem no canal `WEB_CARD` — nada nesta tela
 * decide o que é visível, apenas exibe o que a function pública já
 * filtrou.
 *
 * Cor: `--accent` do estabelecimento (definida em `WebCard.tsx`) — a
 * campanha é do negócio, não da Fidelize. Presença sem competir com o
 * progresso: tinta leve + faixa lateral, nunca um bloco sólido.
 */
export function CampaignCard({
  campaign,
  index = 0,
}: {
  campaign: PublicCardData["campaigns"][number];
  /** Posição na lista — só para escalonar a entrada. */
  index?: number;
}) {
  return (
    <li
      className="relative flex animate-card-in items-start gap-3 overflow-hidden rounded-2xl border border-(--accent)/20 bg-(--accent)/[0.06] p-4 pl-5 shadow-sm shadow-brand-950/[0.03] motion-reduce:animate-none group-data-[card-style=bold]/card:border-(--accent)/30 group-data-[card-style=bold]/card:bg-(--accent)/10 group-data-[card-style=minimal]/card:bg-white group-data-[card-style=minimal]/card:shadow-none"
      style={{ animationDelay: `${220 + index * 90}ms` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-(--accent) group-data-[card-style=minimal]/card:w-0.5"
      />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-(--accent) ring-1 ring-inset ring-(--accent)/20">
        <IconMegaphone className="h-[1.1rem] w-[1.1rem]" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-(--accent)">
          Campanha
        </p>
        <p className="mt-0.5 text-sm font-semibold text-ink group-data-[card-style=bold]/card:text-base">
          {campaign.title}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {campaign.body}
        </p>
      </div>
    </li>
  );
}
