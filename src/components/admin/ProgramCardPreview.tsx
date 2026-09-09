import { IconGift } from "@/components/ui/Icons";

type Branding = {
  primary_color: string | null;
  secondary_color: string | null;
  background_color: string | null;
  text_color: string | null;
  headline: string | null;
  description: string | null;
};

/**
 * Preview ilustrativo do Cartão Digital com as cores REAIS do branding do
 * programa. É só uma composição das cores e textos já cadastrados — não
 * mostra saldo, nem cliente, nem número inventado. Quando a regra do
 * programa tem uma meta numérica (`target`), desenha a quantidade de
 * espaços correspondente, todos vazios.
 */
export function ProgramCardPreview({
  organizationName,
  programName,
  typeLabel,
  branding,
  target,
  rewardName,
}: {
  organizationName: string;
  programName: string;
  typeLabel: string;
  branding: Branding;
  target: number | null;
  rewardName: string | null;
}) {
  const primary = branding.primary_color ?? "#6d3ce0";
  const secondary = branding.secondary_color ?? "#1e0b47";
  const background =
    branding.background_color ??
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  const text = branding.text_color ?? "#ffffff";
  const slots = target && target > 0 && target <= 20 ? target : null;

  return (
    <div
      aria-label={`Prévia do cartão do programa ${programName}`}
      role="img"
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl p-5 shadow-xl shadow-brand-950/20 ring-1 ring-black/5"
      style={{ background, color: text }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-20"
        style={{ background: text }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.16em] opacity-80">
            {organizationName}
          </p>
          <p className="mt-1 truncate font-display text-lg font-bold leading-tight">
            {programName}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold"
          style={{ background: `${text}22`, color: text }}
        >
          {typeLabel}
        </span>
      </div>

      {branding.headline ? (
        <p className="relative mt-5 font-display text-base font-semibold leading-snug">
          {branding.headline}
        </p>
      ) : null}
      {branding.description ? (
        <p className="relative mt-1 text-xs leading-relaxed opacity-80">
          {branding.description}
        </p>
      ) : null}

      {slots ? (
        <div className="relative mt-5 flex flex-wrap gap-2" aria-hidden="true">
          {Array.from({ length: slots }, (_, index) => (
            <span
              key={index}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[0.65rem] font-semibold"
              style={{
                border: `1.5px solid ${text}66`,
                color: `${text}99`,
              }}
            >
              {index + 1}
            </span>
          ))}
        </div>
      ) : null}

      {rewardName ? (
        <div
          className="relative mt-5 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm"
          style={{ background: `${text}1a` }}
        >
          <IconGift className="h-4.5 w-4.5 shrink-0" />
          <span className="min-w-0 truncate font-medium">{rewardName}</span>
        </div>
      ) : null}
    </div>
  );
}
