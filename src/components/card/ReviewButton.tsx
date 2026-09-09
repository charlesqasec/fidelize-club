import { IconExternalLink, IconStar } from "@/components/ui/Icons";

import type { PublicCardReviewChannel } from "@/lib/card/types";

/**
 * Convite NEUTRO de avaliação pública (docs/ARQUITETURA.md, seção 7.4):
 * nunca pede nota específica, nunca condiciona a recompensa, nunca filtra
 * quem vê o botão pela satisfação do cliente. Um único link para o canal
 * que o estabelecimento configurou — nada é escrito em nome do cliente.
 */
export function ReviewButton({ channel }: { channel: PublicCardReviewChannel }) {
  return (
    <a
      href={channel.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-4 shadow-sm shadow-brand-950/[0.03] transition-[background-color,border-color,transform] duration-150 hover:border-(--accent)/30 hover:bg-(--accent)/[0.04] active:scale-[0.99] group-data-[card-style=bold]/card:shadow-md group-data-[card-style=bold]/card:shadow-brand-950/[0.06] group-data-[card-style=minimal]/card:shadow-none"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
        <IconStar className="h-[1.1rem] w-[1.1rem]" fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">
          Avaliar no {channel.label}
        </span>
        <span className="block text-xs text-ink-muted">
          Abre em uma nova aba
        </span>
      </span>
      <IconExternalLink className="h-4 w-4 shrink-0 text-ink-muted" />
    </a>
  );
}
