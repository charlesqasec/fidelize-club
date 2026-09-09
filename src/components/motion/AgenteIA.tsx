"use client";

import { useEffect, useState } from "react";

import { useInView } from "@/components/motion/useInView";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { IconSparkle } from "@/components/ui/Icons";

/**
 * Destaque demonstrativo do Agente de IA no painel do estabelecimento.
 *
 * Nomenclatura comercial: "Agente de IA" — nunca o nome do fornecedor do
 * modelo (docs/ARQUITETURA.md, seção 8.1). Sequência: painel entra →
 * "Analisando recorrência…" → insight. Os 23 clientes são DADOS FICTÍCIOS do
 * estabelecimento demo; o botão "Criar campanha" é inerte — o fluxo real
 * (agente identifica → proprietário analisa → aprova → campanha) é ETAPA 13.
 *
 * Encaixe: vive DENTRO do frame do painel, abaixo do mockup, como uma barra
 * do próprio dashboard — nunca sobrepõe informação do mockup. Card vertical
 * no mobile; barra horizontal no desktop.
 */
export function AgenteIA({ className = "" }: { className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.4 });
  const reduced = useReducedMotion();
  const [insightReady, setInsightReady] = useState(false);

  useEffect(() => {
    if (!inView || reduced) return;
    const timer = window.setTimeout(() => setInsightReady(true), 1700);
    return () => window.clearTimeout(timer);
  }, [inView, reduced]);

  const phase = !inView
    ? "idle"
    : insightReady || reduced
      ? "insight"
      : "analyzing";

  const pill = (
    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-brand-200">
      Demonstração
    </span>
  );

  return (
    <div
      ref={ref}
      className={`rounded-3xl bg-brand-900/95 p-5 ring-1 ring-white/15 lg:flex lg:items-center lg:gap-6 lg:px-6 lg:py-4 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 lg:w-40 lg:shrink-0 lg:justify-start">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
            <IconSparkle className="h-4 w-4" />
          </span>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-brand-300">
            Agente de IA
          </p>
        </div>
        <span className="lg:hidden">{pill}</span>
      </div>

      <div
        aria-live="polite"
        className="mt-4 min-h-[5.5rem] lg:mt-0 lg:min-h-[4.25rem] lg:flex-1"
      >
        {phase === "insight" ? (
          <div className="ai-insight">
            <p className="text-[0.95rem] leading-snug text-white">
              Identificamos{" "}
              <strong className="font-semibold text-brand-200">
                23 clientes
              </strong>{" "}
              que não retornam há mais de 30 dias.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 lg:mt-2.5">
              <button
                type="button"
                disabled
                aria-label="Criar campanha — exemplo demonstrativo, não funcional"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800"
              >
                Criar campanha
              </button>
              <p className="text-[0.75rem] leading-snug text-brand-200/75">
                O proprietário analisa e aprova antes de qualquer campanha ir
                ao ar.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[0.95rem] text-brand-100/90">
              Analisando recorrência…
            </p>
            <div className="ai-bar mt-4 h-1.5 w-full rounded-full lg:mt-3 lg:max-w-md" aria-hidden="true" />
          </div>
        )}
      </div>

      <p className="mt-4 border-t border-white/10 pt-3 text-[0.7rem] leading-relaxed text-brand-200/60 lg:hidden">
        Dados fictícios do estabelecimento demo.
      </p>

      <div className="hidden lg:flex lg:shrink-0 lg:flex-col lg:items-end lg:gap-2">
        {pill}
        <span className="text-[0.7rem] text-brand-200/60">
          Dados fictícios do estabelecimento demo.
        </span>
      </div>
    </div>
  );
}
