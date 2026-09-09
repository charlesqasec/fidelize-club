import { IconLock } from "@/components/ui/Icons";

import type { PublicCardData } from "@/lib/card/types";

import { BrandMark } from "./BrandMark";

/**
 * Cabeçalho do cartão — vive dentro da área com a cor de marca do
 * estabelecimento (ver `WebCard.tsx`, que define `--card-text` etc.).
 *
 * Hierarquia: (1) a MARCA do estabelecimento — logo/iniciais (`BrandMark`)
 * + nome em destaque; (2) o PROGRAMA logo abaixo, como subtítulo. A
 * identidade principal da experiência é o negócio, não a Fidelize
 * (docs/ARQUITETURA.md, seção 2).
 */
export function CardHeader({
  organizationName,
  programName,
  logoUrl,
  customerFirstName,
  membershipStatus,
}: {
  organizationName: string;
  programName: string;
  logoUrl: string | null;
  customerFirstName: string | null;
  membershipStatus: PublicCardData["membership"]["status"];
}) {
  const greeting = customerFirstName ? `Olá, ${customerFirstName}` : "Olá 👋";

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark name={organizationName} logoUrl={logoUrl} />
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--card-text)]/65">
              Cartão de fidelidade
            </p>
            <h1 className="mt-0.5 truncate font-display text-xl font-bold leading-tight text-[color:var(--card-text)] group-data-[card-style=bold]/card:text-2xl">
              {organizationName}
            </h1>
          </div>
        </div>
        {membershipStatus === "BLOCKED" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[0.7rem] font-semibold text-red-50 ring-1 ring-inset ring-red-200/40">
            <IconLock className="h-3 w-3" />
            Bloqueado
          </span>
        ) : membershipStatus === "INACTIVE" ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--card-text)]/15 px-2.5 py-1 text-[0.7rem] font-semibold text-[color:var(--card-text)] ring-1 ring-inset ring-[color:var(--card-text)]/20">
            Inativo
          </span>
        ) : null}
      </div>

      <p className="mt-3 truncate text-sm font-semibold text-[color:var(--card-text)]/85">
        {programName}
      </p>
      <p className="mt-0.5 text-sm font-medium text-[color:var(--card-text)]/70">
        {greeting}
      </p>
    </div>
  );
}
