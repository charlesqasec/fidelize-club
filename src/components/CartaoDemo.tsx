"use client";

import { useEffect, useRef, useState } from "react";

import { useInView } from "@/components/motion/useInView";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import {
  IconCheck,
  IconExternalLink,
  IconGift,
  IconScissors,
  IconSparkle,
  IconStar,
} from "@/components/ui/Icons";
import { demoCard } from "@/lib/site";

type CartaoDemoProps = {
  /** Exibe o bloco de campanhas dentro do cartão. */
  withCampaigns?: boolean;
  /** Exibe o bloco de avaliação/feedback dentro do cartão. */
  withReview?: boolean;
  className?: string;
};

type Stage = "idle" | "reward" | "campaign" | "review";

const ORDER: Stage[] = ["idle", "reward", "campaign", "review"];
const reached = (stage: Stage, target: Stage) =>
  ORDER.indexOf(stage) >= ORDER.indexOf(target);

/**
 * Cartão Digital Fidelize — demonstração renderizada em HTML/CSS.
 *
 * Todo o texto é real e acessível (nunca embutido em imagem). Os dados são de
 * um estabelecimento fictício e estão rotulados como demonstração.
 *
 * Motion (ETAPA 1.3): ao entrar em vista, o cartão "toca" a jornada uma
 * única vez — as visitas contam de 6 até 10, a recompensa é liberada, uma
 * campanha chega como notificação e, por fim, o convite de avaliação
 * aparece. O estado inicial (6 de 10) é o layout aprovado; com
 * prefers-reduced-motion nada anima e todos os blocos ficam visíveis.
 *
 * Este componente é a base visual do futuro cartão em `/c/[identificador]`
 * (ETAPA 5). Aqui ele é puramente demonstrativo.
 */
export function CartaoDemo({
  withCampaigns = true,
  withReview = true,
  className = "",
}: CartaoDemoProps) {
  const {
    business,
    program,
    customer,
    visits: baseVisits,
    target,
    reward,
    campaigns,
  } = demoCard;

  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.45 });
  // No servidor e com reduced motion o cartão fica "desarmado": estado
  // estático aprovado (6 de 10) com todos os blocos visíveis.
  const armed = !useReducedMotion();
  const [visits, setVisits] = useState<number>(baseVisits);
  const [stage, setStage] = useState<Stage>("idle");
  const played = useRef(false);

  useEffect(() => {
    if (!inView || !armed || played.current) return;
    played.current = true;

    const timers: number[] = [];
    const remaining = target - baseVisits;
    const tick = 420;
    const start = 500;

    for (let i = 1; i <= remaining; i += 1) {
      timers.push(
        window.setTimeout(() => setVisits(baseVisits + i), start + i * tick),
      );
    }
    const done = start + remaining * tick;
    timers.push(window.setTimeout(() => setStage("reward"), done + 350));
    timers.push(window.setTimeout(() => setStage("campaign"), done + 1600));
    timers.push(window.setTimeout(() => setStage("review"), done + 2700));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [inView, armed, baseVisits, target]);

  const unlocked = reached(stage, "reward");
  const campaignsVisible = !armed || reached(stage, "campaign");
  const reviewVisible = !armed || reached(stage, "review");
  const remainingVisits = target - visits;

  return (
    <figure
      ref={ref}
      className={`overflow-hidden rounded-4xl border border-line bg-white shadow-2xl shadow-brand-950/10 ${className}`}
    >
      <div className="relative bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 px-6 pb-7 pt-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25">
              <IconScissors className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-[0.95rem] font-semibold leading-tight">
                {business}
              </p>
              <p className="text-xs text-brand-100/80">{program}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-white/90">
            Demonstração
          </span>
        </div>

        <p className="mt-6 font-display text-2xl font-bold leading-tight">
          Olá, {customer}!
        </p>
      </div>

      <div className="px-6 py-7">
        <div
          className="flex flex-wrap gap-2"
          role="img"
          aria-label={`Progresso: ${visits} de ${target} visitas concluídas.`}
        >
          {Array.from({ length: target }, (_, index) => {
            const filled = index < visits;
            const justFilled = filled && visits > baseVisits && index === visits - 1;
            return (
              <span
                key={index}
                aria-hidden="true"
                className={`h-6 w-6 rounded-full ${
                  filled ? "bg-brand-600" : "border-2 border-brand-100 bg-brand-50"
                } ${justFilled ? "dot-pop" : ""}`}
              />
            );
          })}
        </div>

        <p className="mt-4 text-sm font-medium text-ink-soft">
          <strong className="font-semibold text-ink">{visits}</strong> de{" "}
          {target} visitas
        </p>

        <div
          aria-live="polite"
          className={`reward-box mt-5 flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1 ring-inset ${
            unlocked
              ? "reward-box--unlocked bg-brand-600 text-white ring-brand-600"
              : "bg-brand-50 ring-brand-100"
          }`}
        >
          <span className="reward-icon flex shrink-0">
            {unlocked ? (
              <IconCheck className="h-6 w-6 text-white" strokeWidth={2.4} />
            ) : (
              <IconGift className="h-6 w-6 text-brand-600" />
            )}
          </span>
          {unlocked ? (
            <p className="text-sm leading-snug text-white">
              <strong className="font-semibold">Recompensa liberada!</strong>{" "}
              <span className="font-semibold uppercase tracking-wide text-brand-100">
                {reward}
              </span>
            </p>
          ) : (
            <p className="text-sm leading-snug text-ink-soft">
              Faltam{" "}
              <strong className="font-semibold text-ink">
                {remainingVisits} {remainingVisits === 1 ? "visita" : "visitas"}
              </strong>{" "}
              para:{" "}
              <strong className="font-semibold uppercase tracking-wide text-brand-700">
                {reward}
              </strong>
            </p>
          )}
        </div>

        {withCampaigns ? (
          <div
            className={`card-block mt-6 border-t border-line pt-6 ${
              campaignsVisible ? "" : "card-block--hidden"
            }`}
          >
            <h3 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-muted">
              Campanhas para você
            </h3>
            <ul className="mt-3.5 space-y-2.5">
              {campaigns.map((campaign, index) => (
                <li
                  key={campaign.title}
                  className={`card-block flex gap-3 rounded-2xl border border-line bg-surface-soft px-4 py-3 ${
                    index === 0 && !campaignsVisible ? "card-notify--hidden" : ""
                  }`}
                  style={index === 0 ? { transitionDelay: "180ms" } : undefined}
                >
                  <IconSparkle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {campaign.title}
                      </p>
                      {index === 0 && armed ? (
                        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-white">
                          Nova
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[0.8rem] leading-snug text-ink-muted">
                      {campaign.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {withReview ? (
          <div
            className={`card-block mt-6 border-t border-line pt-6 ${
              reviewVisible ? "" : "card-block--hidden"
            }`}
          >
            <div className="flex items-center gap-2">
              <IconStar className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-ink">
                Conte como foi sua experiência
              </h3>
            </div>
            <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted">
              Sua opinião ajuda este estabelecimento a melhorar.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                aria-label="Avaliar no Google — exemplo demonstrativo, não funcional"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[0.8rem] font-medium text-ink-soft"
              >
                <IconExternalLink className="h-3.5 w-3.5" />
                Avaliar no Google
              </button>
              <button
                type="button"
                disabled
                aria-label="Enviar feedback — exemplo demonstrativo, não funcional"
                className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[0.8rem] font-medium text-ink-soft"
              >
                Enviar feedback
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-muted">
          <span>Histórico</span>
          <span aria-hidden="true" className="text-brand-200">
            ·
          </span>
          <span>Recompensas</span>
          <span aria-hidden="true" className="text-brand-200">
            ·
          </span>
          <span>Meu perfil</span>
        </div>
      </div>

      <figcaption className="border-t border-line bg-surface-soft px-6 py-3 text-[0.7rem] leading-relaxed text-ink-muted">
        Exemplo ilustrativo do Cartão Digital Fidelize. Estabelecimento e dados
        fictícios. Botões de avaliação são apenas demonstrativos.
      </figcaption>
    </figure>
  );
}
