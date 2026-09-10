import { IconExternalLink, IconStar } from "@/components/ui/Icons";

import type { PublicCardReviewChannel } from "@/lib/card/types";

/**
 * Convite NEUTRO de avaliação pública (docs/ARQUITETURA.md, seções 7.3–7.4).
 *
 * Bloco discreto, exibido logo ABAIXO do feedback interno e SÓ quando o
 * estabelecimento configurou um canal de avaliação: `review_channels` com
 * `status = 'ACTIVE'` e `organization_feature_flags.reviews_enabled = true`
 * — condição resolvida inteiramente em `public.get_public_card`, que
 * entrega aqui apenas `{ label, url }` (`card.reviewChannel`).
 *
 * Nunca pede nota específica, nunca condiciona recompensa/pontos, nunca faz
 * *review gating* e NUNCA depende da nota dada no feedback interno (este
 * componente é stateless e independente de `FeedbackCard`). O botão abre
 * somente a URL cadastrada pelo estabelecimento (`channel.url`) numa nova
 * aba — nada hardcoded, nada inventado.
 */
export function ReviewButton({ channel }: { channel: PublicCardReviewChannel }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-sm shadow-brand-950/[0.03] group-data-[card-style=bold]/card:shadow-md group-data-[card-style=bold]/card:shadow-brand-950/[0.06] group-data-[card-style=minimal]/card:shadow-none">
      <h2 className="font-display text-sm font-semibold text-ink">
        Gostou da experiência?
      </h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        Avalie este estabelecimento no {channel.label}
      </p>

      <a
        href={channel.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Avaliar no ${channel.label} (abre em nova aba)`}
        className="mt-3 flex items-center justify-center gap-2 rounded-full border border-(--accent)/30 px-4 py-2.5 text-sm font-semibold text-(--accent) transition-[background-color,transform] duration-150 hover:bg-(--accent)/[0.06] active:scale-[0.98]"
      >
        <IconStar className="h-4 w-4 shrink-0" fill="currentColor" />
        Avaliar no {channel.label}
        <IconExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    </section>
  );
}
