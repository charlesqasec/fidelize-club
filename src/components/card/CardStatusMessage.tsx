import type { ReactNode } from "react";

import { IconAlert, IconClock, IconLock } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";

import { CardFooter } from "./CardFooter";

export type CardStatusVariant = "not_found" | "inactive" | "paused" | "unavailable";

const ICONS: Record<CardStatusVariant, ReactNode> = {
  not_found: <IconAlert className="h-6 w-6" />,
  inactive: <IconLock className="h-6 w-6" />,
  paused: <IconClock className="h-6 w-6" />,
  unavailable: <IconAlert className="h-6 w-6" />,
};

/**
 * Estado de página inteira do Web Card quando não há cartão para mostrar:
 * link inválido, cartão inativo, programa pausado/arquivado, ou
 * indisponibilidade de infraestrutura. Usado tanto por
 * `src/app/c/[token]/page.tsx` (estados resolvidos) quanto por
 * `src/app/c/[token]/not-found.tsx` (`notFound()`, variant="not_found").
 *
 * Sempre com a identidade Fidelize (nunca a do estabelecimento, que aqui
 * ainda não foi resolvida com segurança) e uma mensagem curta, honesta,
 * sem jargão técnico.
 */
export function CardStatusMessage({
  variant,
  title,
  description,
}: {
  variant: CardStatusVariant;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 text-center shadow-xl shadow-brand-950/[0.06]">
          <Logo />
          <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-soft text-ink-muted ring-1 ring-inset ring-line">
            {ICONS[variant]}
          </div>
          <h1 className="mt-5 font-display text-lg font-semibold text-brand-950">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        </div>
      </div>
      <CardFooter />
    </div>
  );
}
