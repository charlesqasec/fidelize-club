import type { CSSProperties } from "react";

import type { PublicCardData } from "@/lib/card/types";

import { CampaignCard } from "./CampaignCard";
import { CardFooter } from "./CardFooter";
import { CardHeader } from "./CardHeader";
import { FeedbackCard } from "./FeedbackCard";
import { LoyaltyProgress } from "./LoyaltyProgress";
import { RewardCard } from "./RewardCard";
import { ReviewButton } from "./ReviewButton";

const FIDELIZE_PRIMARY = "#6d3ce0";
const FIDELIZE_SECONDARY = "#1e0b47";

/** `#rgb` ou `#rrggbb` → [r, g, b] em 0–255; qualquer outra coisa → null. */
function hexToRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminância relativa (WCAG 2.x). */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastAgainstWhite(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 1.05 / (luminance(rgb) + 0.05);
}

/**
 * Cor de acento para os blocos BRANCOS (recompensa, campanha, feedback):
 * a primeira cor do branding que garante contraste ≥ 4.5:1 sobre branco
 * (AA para texto normal). Se nenhuma serve — marca muito clara — volta ao
 * roxo Fidelize em vez de arriscar texto ilegível. Nunca uma cor inventada.
 */
function pickAccent(...candidates: (string | null | undefined)[]): string {
  for (const color of candidates) {
    if (color && contrastAgainstWhite(color) >= 4.5) return color;
  }
  return FIDELIZE_PRIMARY;
}

/**
 * Composição completa do Web Card — a experiência pública do consumidor
 * já cadastrado. A cor de marca vem de `card.branding`; sem branding
 * configurado, cai no roxo Fidelize (mesma convenção do
 * `ProgramCardPreview` do Fidelize Admin, ETAPA 3.4) — nunca uma cor
 * inventada por programa.
 *
 * Variáveis CSS expostas aos filhos:
 *  - `--card-text` / `--card-bg`: dentro do cartão colorido (topo).
 *  - `--accent`: acento do estabelecimento sobre superfícies brancas,
 *    já validado para contraste (ver `pickAccent`).
 *
 * `data-card-style` (CLASSIC | MINIMAL | BOLD) muda só acabamento —
 * sombras, ornamento, escala de títulos — via variantes `group-data-*`
 * nos filhos. Mesma estrutura, mesmo conteúdo, nos três.
 */
export function WebCard({ card, token }: { card: PublicCardData; token: string }) {
  const branding = card.branding;
  const primary = branding?.primaryColor ?? FIDELIZE_PRIMARY;
  const secondary = branding?.secondaryColor ?? FIDELIZE_SECONDARY;
  const background =
    branding?.backgroundColor ??
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  const text = branding?.textColor ?? "#ffffff";
  const accent = pickAccent(primary, secondary);
  const cardStyle = (branding?.cardStyle ?? "CLASSIC").toLowerCase();

  const rootStyle = { "--accent": accent } as CSSProperties;
  const heroStyle = {
    background,
    "--card-text": text,
    "--card-bg": secondary,
  } as CSSProperties;

  const headline = branding?.headline?.trim();
  const description = branding?.description?.trim();
  const isPaused = card.program.status === "PAUSED";
  const showReputation = card.feedbackEnabled || Boolean(card.reviewChannel);

  return (
    <div
      className="group/card min-h-screen bg-surface-soft data-[card-style=minimal]:bg-white"
      data-card-style={cardStyle}
      style={rootStyle}
    >
      <div className="mx-auto w-full max-w-md px-4 pb-8 pt-5 sm:px-5 sm:pt-7">
        {/* Cartão de marca do estabelecimento */}
        <section
          className="relative animate-card-in overflow-hidden rounded-3xl p-5 shadow-xl shadow-brand-950/25 ring-1 ring-black/5 motion-reduce:animate-none group-data-[card-style=bold]/card:shadow-2xl group-data-[card-style=bold]/card:shadow-brand-950/35 group-data-[card-style=minimal]/card:shadow-md group-data-[card-style=minimal]/card:shadow-brand-950/10 sm:p-6"
          style={heroStyle}
          aria-label={`Cartão de ${card.organization.name}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[color:var(--card-text)]/10 blur-2xl group-data-[card-style=bold]/card:bg-[color:var(--card-text)]/20 group-data-[card-style=minimal]/card:hidden"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-[color:var(--card-text)]/[0.07] blur-2xl group-data-[card-style=bold]/card:bg-[color:var(--card-text)]/[0.14] group-data-[card-style=minimal]/card:hidden"
          />

          <div className="relative">
            <CardHeader
              organizationName={card.organization.name}
              programName={card.program.name}
              logoUrl={branding?.logoUrl ?? null}
              customerFirstName={card.customer.firstName}
              membershipStatus={card.membership.status}
            />

            {headline ? (
              <p className="mt-4 font-display text-[0.95rem] font-semibold leading-snug text-[color:var(--card-text)] group-data-[card-style=bold]/card:text-lg">
                {headline}
              </p>
            ) : null}
            {description ? (
              <p className="mt-1 text-[0.8rem] leading-relaxed text-[color:var(--card-text)]/75">
                {description}
              </p>
            ) : null}

            {isPaused ? (
              <p className="mt-4 rounded-xl bg-[color:var(--card-text)]/15 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-[color:var(--card-text)] ring-1 ring-inset ring-[color:var(--card-text)]/15">
                Programa pausado temporariamente pelo estabelecimento.
              </p>
            ) : null}

            <div className="mt-5 border-t border-[color:var(--card-text)]/15 pt-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--card-text)]/60">
                Seu progresso
              </p>
              <div className="mt-3">
                <LoyaltyProgress
                  program={card.program}
                  membership={card.membership}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Blocos de conteúdo — entram logo depois do cartão */}
        <main className="mt-3 animate-card-in space-y-3 [animation-delay:120ms] motion-reduce:animate-none">
          <RewardCard
            rewards={card.rewards}
            program={card.program}
            membership={card.membership}
          />

          {card.campaigns.length > 0 ? (
            <ul className="space-y-3" aria-label="Campanhas para você">
              {card.campaigns.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  index={index}
                />
              ))}
            </ul>
          ) : null}

          {showReputation ? (
            <div className="space-y-3">
              {card.feedbackEnabled ? <FeedbackCard token={token} /> : null}
              {card.reviewChannel ? (
                <ReviewButton channel={card.reviewChannel} />
              ) : null}
            </div>
          ) : null}
        </main>
      </div>

      <CardFooter />
    </div>
  );
}
